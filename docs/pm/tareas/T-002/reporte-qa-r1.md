# Reporte QA T-002 — ronda 1

**Veredicto:** FAIL
**Resumen:** Se confirmaron 5 defectos: 1 S1/P1, 1 S2/P1, 2 S3/P2 y 1 S4/P3. Las respuestas asíncronas pueden mezclar los récords de dos miembros y permitir reasignarlos por error; operaciones rápidas concurrentes también dejan una lista distinta de la base.
El gate es válido para el código revisado, pero no cubre estas transiciones. Quedan pruebas de interfaz obligatorias pendientes; no corresponde aprobar el merge.

## Alcance cubierto

- Diff revisado completo: 10 archivos, `3ad328ebb4306a2eec2da514c1968e434216f1dd..c12cde517e83d67e53176e52268a196f924f32a8`, rama `oliver132123/records-panel`. Origen obtenido con `git merge-base oliver132123/records-schema HEAD` porque la base avanzó. Los cinco archivos funcionales corresponden a los previstos; los otros cinco son los briefs trasladados, entrega, gate y pruebas del PM, justificados como documentación de la tarea. Sin cambios en archivos prohibidos, migraciones ni UI del equipo.
- Gate: `docs/pm/tareas/T-002/gate-r1.txt:5` registra `82befdad3d6b9f6d63af0d31431a53d67702e85f`, no el HEAD actual. Verifiqué `git diff 82befdad HEAD --stat`: únicamente añade `gate-r1.txt` y `pruebas-pm-r1.txt` (157 líneas); código y tests idénticos. Por ello la ejecución del PM es aplicable; no es evidencia obsoleta de implementación. La versión antigua de 0013 pertenece a la base y es esperada, no un defecto T-002.
- Técnicas aplicadas: particiones de equivalencia; valores límite; tabla de decisión de 18 combinaciones; transiciones cerrado/lista/alta/edición/guardando/error, cambio de miembro y operaciones solapadas; revisión de ramas y capturas de estado; error guessing sobre cifras, URLs, errores, doble envío y consistencia UI/base.
- Ejecutado por QA: `npx tsc --noEmit --incremental false` → código 0, sin diagnósticos. `git status --short` → vacío. Lecturas y `git diff` sin modificar worktrees.
- Ejecutado por QA: `node` por stdin, leyendo `lib/records-form.ts` y transpilándolo en memoria con `typescript.transpileModule` (sin emitir archivos, sin importar cliente DB), para explorar entradas y verificar 18 combinaciones → 18/18 resultados esperados y CHECK velocidad/unidad coherente para todas las filas válidas. Se ejecutaron además expresiones puras de actualización de estado para ilustrar D01/D02; no son pruebas de React ni de integración DB.
- Evidencia ejecutada por el PM: typegen, tsc, lint y build OK; 8 archivos de tests, 177/177 unitarias (`gate-r1.txt`). Build con advertencia PGRST200 por schema remoto todavía no desplegado, ya documentada; no equivale a smoke funcional de producción. No repetí ese build ni accedí a servicios remotos.
- No ejecutado por restricciones: typegen, build, vitest, servidor y escritura en Supabase local. No se intentaron comandos prohibidos. El recorrido de navegador es evidencia del PM (`pruebas-pm-r1.txt:5`), no ejecución propia de QA.

### Tabla de decisión y valores explorados

En cada fila se revisaron ambas unidades (`mph` y `km_h`):

| Tiempo | Velocidad | Validación | Fila válida / CHECK |
| -- | -- | -- | -- |
| vacío | vacía | válida | ambos null; unidad null |
| vacío | válida | válida | tiempo null; velocidad numérica + unidad elegida |
| vacío | basura | error velocidad | no enviar |
| válido | vacía | válida | tiempo numérico; velocidad y unidad null |
| válido | válida | válida | ambas cifras + unidad elegida |
| válido | basura | error velocidad | no enviar |
| basura | vacía | error tiempo | no enviar |
| basura | válida | error tiempo | no enviar |
| basura | basura | error tiempo primero | no enviar |

Representantes: `''`, `9.874` para tiempo, `142.5` para velocidad y `basura`. Evidencia: `lib/records-form.ts:95`, `:103`, `:144`, `:148`; salida propia: `Tabla decision: 18/18 correctos`.

| Campo / entradas | Resultado observado en la función real |
| -- | -- |
| Tiempo `9,874`, `9.874` | válidos; ambos convierten a 9.874 |
| Tiempo `1.234,5`, `1e3`, `0x10`, `9abc`, `-0` | error de tiempo |
| Tiempo `  ` | válido como ausencia; convierte a null, nunca a cero |
| Tiempo `.5`, `5.` | rechazados; ver pregunta de sintaxis abajo |
| Tiempo `99999.999` / `100000` / `0.0001` | válido / error / error |
| Velocidad `9999.99` / `10000` / `0.001` | válida / error / error |
| Año `2024.5` / `1949` | ambos devuelven el mensaje exacto de año |
| Fuente `javascript:`, `JAVASCRIPT:`, ` javascript:`, `data:`, `//evil.com`, `https:` | todas rechazadas |
| Fuente `https://` | aceptada por prefijo; ver riesgo abajo |

Los límites `0.001` de tiempo, `0.01` de velocidad y años 1949/1950/2100/2101 también están en tests del dev cubiertos por el gate. Espacios alrededor y basura mezclada se distinguen: `trim()` normaliza blancos puros, pero `9abc` no pasa. `aFilaRecord` requiere validación previa por contrato; sus salidas con formularios inválidos no se califican como defecto de persistencia.

### Evaluación del testware y checklist

- Los 48 tests nuevos ejercitan funciones reales, con expectativas explícitas; no mockean DB. Detectarían quitar la obligatoriedad de alcance, conservar mph con velocidad vacía, romper la coma decimal o perder el mapeo null → ninguno. No hice mutation testing ni reejecuté Vitest.
- No hay pruebas de componente para callbacks tardíos, carreras, visibilidad de errores, validación HTML nativa ni doble envío. Faltan casos unitarios explícitos de año fraccionario y varias entradas de error guessing; la exploración propia no reemplaza una regresión durable del dev. Las cuatro pruebas llamadas ida/vuelta tienen cobertura parcial de campos en tres casos; no prueban todos los campos opcionales no nulos.
- La entrega distingue expresamente curl local de UI no ejecutada (`entrega-dev.md`, sección «Verificación manual»); el PM añade su recorrido. No hay defecto de proceso por afirmar un clic-a-clic inexistente. El error CHECK vía curl no demuestra CA-9 en pantalla.
- RLS/RPC/migraciones: sin cambios; la seguridad de la tabla corresponde a T-001. No se introducen secretos, service role, hosts externos, redirecciones, rutas públicas, cambios de slugs, Storage ni operaciones de fotos. Fechas usan `fechaLogro`, sin conversiones horarias nuevas.
- API Next revisada contra `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md`: `router.refresh()` conserva el estado cliente; no soluciona los arrays obsoletos de D01/D02. `MiembrosAdmin.tsx:59` inicializa `miembros` con `useState(inicial)` y no resincroniza la prop.

## Trazabilidad de criterios

Rutas abreviadas: `RecordsModal.tsx` y `MiembrosAdmin.tsx` están en `app/(admin)/(panel)/admin/miembros/`; todos los números de línea corresponden al HEAD revisado. CUMPLE estático no significa recorrido UI ejecutado. NO VERIFICABLE indica evidencia dinámica insuficiente, no un defecto confirmado.

| CA | Resultado | Evidencia |
| -- | -- | -- |
| CA-1 | CUMPLE | `MiembrosAdmin.tsx:289`, `RecordsModal.tsx:56`, `:153`; apertura y orden comprobados por PM, `pruebas-pm-r1.txt:10` y `:11`. |
| CA-2 | NO CUMPLE | Datos, categoría, etiqueta, fecha, estado y SUMA usan helpers/condición correcta (`RecordsModal.tsx:361`); un hito muestra «—» en Marca en vez de nada (`:385`), D05. |
| CA-3 | CUMPLE | `RecordsModal.tsx:340` y `:345`: botón disponible y texto exacto cuando no hay récords, por revisión estática; falta recorrido de lista vacía. |
| CA-4 | NO CUMPLE | Función valida con mensajes previstos (`lib/records-form.ts:88`); `RecordsModal.tsx:79` retorna antes de DB. UI oculta feedback desplazado (D03/O-1) y año inválido dispara validación nativa antes del submit (D04). |
| CA-5 | CUMPLE | Tabla de decisión y exploración propias; `lib/records-form.ts:66`, `:95`, `:103`; PM comprobó coma (`pruebas-pm-r1.txt:14`). |
| CA-6 | CUMPLE | `lib/records-form.ts:131`; tests de conversión y tabla propia; vacío de velocidad siempre implica unidad null para inputs válidos. |
| CA-7 | NO VERIFICABLE | Alta vista por PM (`pruebas-pm-r1.txt:14`); edición usa `.eq('id').select('*').single()` y respuesta real (`RecordsModal.tsx:90`), null → ninguno (`lib/records-form.ts:50`). Falta edición UI, incluido alcance nulo; D01/D02 afectan además la integridad del estado de la lista. |
| CA-8 | NO VERIFICABLE | `RecordsModal.tsx:77`, `:85`, `:332`: guardia y estado antes del await, único onSubmit (`:163`), botón disabled/texto correcto. No hay evidencia de doble clic/Enter real; la mera actualización asíncrona de useState no prueba duplicación por sí sola. |
| CA-9 | NO VERIFICABLE | Ramas de error conservan form y rehabilitan botón (`RecordsModal.tsx:97`, `:109`), no llaman onCambio. Falta error DB en interfaz; el mismo contenedor de O-1 puede ocultarlo. |
| CA-10 | NO CUMPLE | Secuencia simple comprobada por PM (`pruebas-pm-r1.txt:15`); error retorna sin cambiar lista (`RecordsModal.tsx:130`). Dos acciones solapadas restauran estado viejo/SUMA incorrecto: D02. |
| CA-11 | CUMPLE | `RecordsModal.tsx:137`; confirm/cancel y delete exitoso comprobados por PM (`pruebas-pm-r1.txt:16`). Aceptación mediante sustitución de confirm documentada; falta confirm nativo aceptado y regresión concurrente D02. |
| CA-12 | NO CUMPLE | Reapertura secuencial vista por PM (`pruebas-pm-r1.txt:17`); respuesta tardía de A llena el modal de B (`MiembrosAdmin.tsx:518`), D01. |
| CA-13 | NO VERIFICABLE | Diff conserva handlers existentes y tests previos verdes; PM solo abrió galería (`pruebas-pm-r1.txt:18`). Faltan editar/borrar miembro y CRUD de galería en UI. |

## Defectos

### T-002-D01 — Una respuesta tardía de un miembro contamina el modal de otro y permite reasignar récords

- **Severidad / Prioridad:** S1 / P1
- **Área:** ui / integridad de datos
- **Ubicación:** `MiembrosAdmin.tsx:514`, especialmente `:518`; `RecordsModal.tsx:88`, `:94`, `:150`; `lib/records-form.ts:141`.
- **Pasos / condición:** Abrir A e iniciar una mutación con respuesta demorada; cerrar (se permite durante el await), abrir Récords de B y dejar llegar la respuesta de A. Editar desde el modal titulado B uno de los récords de A que acaba de aparecer y guardar.
- **Esperado:** CA-12: los récords de A nunca aparecen en B. Guardar un cambio de título/fecha no debe cambiar de dueño un récord por accidente.
- **Obtenido:** La callback antigua actualiza correctamente el array global de A, pero `setRecordsDe((m) => (m ? { ...m, records } : m))` reemplaza también los records del modal actualmente abierto B, sin verificar id. Al editarlo, `aFilaRecord(form, miembro.id)` pone el id de B y el UPDATE filtra únicamente por el id del récord A; el admin puede persistir esa reasignación no solicitada. S1 por la consecuencia de corrupción de propiedad, no por la frecuencia de la carrera.
- **Evidencia:** Derivación estática reproducible y evaluación pura de las mismas expresiones: `D01 respuesta tardia: {"id":2,"records":[{"id":11,"miembro_id":1,"vigente":false}]}`; payload posterior `{"id":11,"miembro_id":2,"vigente":false}`. Las clausuras sobreviven al desmontaje; no hay cancelación ni comprobación de miembro. No se reprodujo contra DB ni navegador.
- **Sugerencia:** Asociar cada respuesta a su miembro y actualizar el modal solo si sigue siendo el mismo; preservar el dueño en edición y acotar la mutación a ese dueño. Añadir regresión de respuesta demorada A → cerrar → abrir B → editar.
- **Introducido por:** este cambio; el patrón del palmarés era preexistente, pero la ruta que mezcla/reasigna récords es nueva.

### T-002-D02 — Acciones rápidas simultáneas sobrescriben resultados confirmados con un array viejo

- **Severidad / Prioridad:** S2 / P1
- **Área:** ui / consistencia UI ↔ base
- **Ubicación:** `RecordsModal.tsx:122`, `:134`, `:146`, `:395`; `MiembrosAdmin.tsx:516`.
- **Pasos / condición:** Con R1 y R2 vigentes, hacer clic en «Marcar superado» de R1 y después de R2 antes de recibir la primera respuesta. Ambas operaciones terminan correctamente. Variante: borrar una fila y alternar otra durante la espera.
- **Esperado:** CA-10/CA-12 y «la base manda»: ambas modificaciones deben mantenerse, SUMA y orden deben coincidir con lo persistido.
- **Obtenido:** Los dos handlers capturan el mismo `records`; cada respuesta construye y reemplaza la lista completa desde ese snapshot. La última restaura el estado viejo de la otra fila; un delete concurrente puede reaparecer visualmente. La inconsistencia queda también en `miembros`, incluso cerrando y reabriendo.
- **Evidencia:** No hay bloqueo en acciones rápidas. Para snapshot `[{id:11,vigente:true},{id:12,vigente:true}]`, ejecutar los dos `records.map(...)` de `:134` deja `[{"id":11,"vigente":true},{"id":12,"vigente":false}]`, aunque ambos PATCH exitosos almacenaron false. Evaluación pura propia, sin mock de DB; recorrido real pendiente. `router.refresh()` conserva useState y no recompone ese array.
- **Sugerencia:** Aplicar la respuesta por id sobre el estado más reciente del miembro; serializar operaciones donde corresponda. Regresión con dos filas, respuestas en ambos órdenes y delete + update.
- **Introducido por:** este cambio.

### T-002-D03 — O-1: el error de validación queda fuera de la vista tras enviar

- **Severidad / Prioridad:** S3 / P2
- **Área:** ui / feedback de validación
- **Ubicación:** `RecordsModal.tsx:81`, `:160`, `:321`; `app/(admin)/admin.module.css:503`.
- **Pasos / condición:** En ventana 730×837, abrir alta, escribir título, dejar alcance sin elegir, desplazarse al botón Agregar y enviarlo.
- **Esperado:** CA-4: el panel muestra el mensaje para que el admin sepa por qué no guardó.
- **Obtenido:** El error se añade arriba del formulario y queda fuera del área visible; no se enfoca, desplaza ni anuncia. El usuario puede verlo desplazándose hacia arriba, por eso S3, no S2; corresponde resolverlo en esta tarea.
- **Evidencia:** PM observó `y = -80 px` (`docs/pm/tareas/T-002/pruebas-pm-r1.txt:23`). El código solo hace `setError` y renderiza el div anterior al form; no hay mecanismo para acercarlo al botón ni hacerlo visible. No es pérdida de datos ni ausencia de validación.
- **Sugerencia:** Mostrar feedback junto a las acciones o desplazar/enfocar el error al fallar; verificar también CA-9 con el formulario desplazado.
- **Introducido por:** este cambio en el nuevo formulario, aunque reutiliza estilos existentes.

### T-002-D04 — El año inválido evita el mensaje español especificado del panel

- **Severidad / Prioridad:** S3 / P2
- **Área:** ui / validación
- **Ubicación:** `RecordsModal.tsx:163`, `:277`; `lib/records-form.ts:115`.
- **Pasos / condición:** Formulario válido salvo año 1949, 2101 o 2024.5; enviar normalmente con el botón.
- **Esperado:** CA-4: mostrar «El año tiene que estar entre 1950 y 2100.» sin llamar a DB.
- **Obtenido:** `type="number" min="1950" max="2100"`, con step entero por defecto y form sin `noValidate`, activa la validación HTML antes del evento submit. Se presenta feedback nativo del navegador, no el mensaje contratado de `validarRecord`; su idioma depende del navegador. La entrada se bloquea, por lo que es defecto de feedback con workaround, no de corrupción.
- **Evidencia:** Revisión del markup anterior; el mensaje del panel se establece únicamente dentro de `guardar`, después de recibir submit (`:75`). La función pura sí devolvió el texto esperado para 1949 y 2024.5 en la ejecución propia; los tests de función no cubren la barrera HTML. Confirmación visual pendiente al PM.
- **Sugerencia:** Unificar la validación del envío para garantizar los mensajes del contrato y cubrir año fraccionario en pruebas de interfaz.
- **Introducido por:** este cambio.

### T-002-D05 — Un hito muestra un guion en la columna Marca donde CA-2 pide nada

- **Severidad / Prioridad:** S4 / P3
- **Área:** ui / presentación
- **Ubicación:** `RecordsModal.tsx:385`.
- **Pasos / condición:** Listar un hito con tiempo y velocidad null.
- **Esperado:** CA-2 especifica «formatearMarca si hay cifras (si no, nada en su lugar)».
- **Obtenido:** Se renderiza «—» porque se usa `formatearMarca(r) ?? '—'`.
- **Evidencia:** `lib/records.ts` devuelve null para el hito; la expresión JSX reemplaza ese null por un guion. No afecta SUMA ni cifras guardadas.
- **Sugerencia:** Mantener vacía esa celda cuando no existe marca, o que el PM ajuste explícitamente el criterio si acepta el placeholder.
- **Introducido por:** este cambio.

## Riesgos y preguntas (sin evidencia suficiente para defecto)

- **O-2 evaluada:** el scroll horizontal de la tabla de miembros, por sí solo, no incumple CA-1: la acción existe y el PM accedió a ella; no hay requisito de que toda la tabla quepa en 730 px. El recorte de acciones dentro del modal requiere comprobar el scroll del contenedor y el elemento real bajo el puntero. `RecordsModal.tsx:348` usa `tablaWrap`, con `overflow-x:auto` (`admin.module.css:345`), y el fondo cierra intencionalmente (`RecordsModal.tsx:150`). La observación de clic fuera del borde no demuestra que un botón visible reciba el clic y cierre, ni que sea imposible alcanzarlo desplazándose. **No asigno defecto ni S/P sin esa comprobación**; sí riesgo de usabilidad relacionado con CA-7/10/11. Si un botón sigue inaccesible tras scroll o su hitbox cae en el fondo, corresponde abrir defecto (S3/P2 si existe alternativa razonable; S2/P1 si impide la acción). Evaluarlo también en móvil.
- CA-8 tiene protección estática razonable para envíos normales; no hay evidencia para afirmar duplicación solo por usar useState en vez de ref. Sigue pendiente el doble clic/Enter real con latencia.
- CA-9: ausencia de catch para excepciones inesperadas no demuestra que Supabase arroje en vez de devolver `{error}` en la ruta real. Verificar devolución DB y fallo de transporte sin dar por probada la recuperación con el curl de CHECK.
- Cancelar durante guardado y abrir otra alta/edición puede permitir que la respuesta vieja ejecute `setForm(null)` (`RecordsModal.tsx:118`) sobre el nuevo borrador. Cubrir esa transición; no se incluye como pérdida persistida adicional a D01.
- `.5` y `5.` se rechazan. El brief fija coma/punto y precisión, pero no explicita si admite omitir los dígitos a un lado del separador; confirmar esa gramática antes de exigir ampliar el parser. `1e3` y `0x10` no son la notación decimal acordada.
- `https://` sin host se acepta (`lib/records-form.ts:120`), coherente con el CA literal de prefijo y con el CHECK de esta base. No es un bypass javascript ni un defecto confirmado contra ese contrato; si se exige URL navegable, definir validación de host y sus pruebas.
- En mensajes de error de operaciones rápidas no se limpia un error anterior al iniciar ni al completar una operación exitosa (`RecordsModal.tsx:122`, `:137`). Comprobar si queda feedback obsoleto tras un reintento satisfactorio.
- El gate exitoso no verifica el orden de despliegue T-001 → T-002 ni disponibilidad real de datos en producción; no se hizo ninguna comprobación remota en esta QA.

## Pruebas a ejecutar por el PM

Usar únicamente el entorno local autorizado y datos `t002-`; no resetear la instancia compartida. No pude ejecutar estas pruebas porque requieren navegador/servidor y mutaciones de la base. Las respuestas demoradas pueden controlarse en el transporte HTTP del navegador, manteniendo Postgres real; no mockear la capa DB.

1. **D01, bloqueante:** dos miembros locales A/B, demorar respuesta de alta/update de A, cerrar, abrir B, completar A. B debe conservar exclusivamente sus filas. Intentar editar desde B y comprobar que ningún `miembro_id` de A cambia; repetir con marcar y borrar. Capturar ids, requests, respuestas y estado de ambos miembros.
2. **D02, bloqueante:** dos nacionales vigentes, marcar ambos superados antes de las respuestas, variar orden de llegada y comprobar ambos false en UI/base, sin SUMA y con orden correcto. Repetir delete + update, cerrar/reabrir, y alta tras Cancelar con operación todavía pendiente.
3. **CA-8 obligatorio:** doble clic rápido en Guardar y Enter repetido con respuesta demorada. Debe verse disabled/«Guardando…» y exactamente una petición de insert y una fila real. Repetir en edición, y después de un error para comprobar rehabilitación.
4. **CA-9 obligatorio:** provocar un error de DB local controlado al guardar, sin cambios de schema ni resets (por ejemplo eliminar previamente una fila de prueba que está en edición, para que `.single()` reciba cero filas). Debe aparecer mensaje visible, conservar todos los campos, mantener lista previa y rehabilitar Guardar. Si se necesita específicamente CHECK, inducirlo en un payload HTTP de prueba local y registrar el error real de Postgres; no confundirlo con un mensaje fabricado.
5. **CA-7 obligatorio:** editar récord de alcance NULL y confirmar «Ninguno — no suma» seleccionado antes de tocarlo; guardar sin cambiar alcance; editar categoría/fecha/cifras y comprobar respuesta devuelta, orden y persistencia. Quitar velocidad manteniendo mph elegido debe guardar ambos null; probar km/h. Crear hito nacional y sin alcance desde UI.
6. **D03/O-1 y D04:** a 730×837, enviar desde abajo con alcance vacío, título vacío, cifra inválida, fuente javascript y años 1949/2101/2024.5. Ver texto exacto en español, visible sin búsqueda y ninguna petición DB. Repetir error DB con scroll abajo.
7. **O-2:** a 730×837 y ancho móvil, desplazar horizontalmente cada contenedor hasta las acciones, registrar `clientWidth`, `scrollWidth`, `scrollLeft`, rectángulo y `elementFromPoint` de cada botón. Editar/Borrar/Marcar deben poder activarse sin cerrar por clic de fondo; registrar si Tab/Enter ofrece alternativa. No considerar un clic en coordenadas recortadas equivalente a clic real sobre el botón.
8. **CA-3, CA-10 y CA-11:** miembro sin récords muestra texto exacto y alta; error real en Marcar/Borrar deja lista previa y mensaje visible; confirmar nativamente Borrar tanto aceptando como cancelando. Para D05, hito sin cifras debe tener celda Marca vacía.
9. **CA-12/13 regresión:** editar y borrar un miembro `t002-`, CRUD de su galería de trofeos y cambiar de miembro tras operaciones concluidas; comprobar que cada modal conserva solo sus propios datos y slugs estables. La mera apertura de galería y las unitarias no cubren este recorrido.
10. **Tras correcciones:** PM ejecuta `npx next typegen && npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build` con entorno local controlado; adjuntar gate para el nuevo HEAD y evidencia de confirmación D01–D05. QA no los corrió porque escriben en el worktree (salvo el tsc sin incremental ya ejecutado).
