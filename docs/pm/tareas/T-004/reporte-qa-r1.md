# Reporte QA T-004 — ronda 1

**Veredicto:** FAIL  
**Resumen:** El gate corresponde al `HEAD` revisado y TypeScript pasa. La implementación usa correctamente los filtros de nulos y separa los estados por dueño, pero los tests nuevos incumplen la prohibición de mockear datos y el panel oculta errores de lectura. Los flujos y la presentación con datos siguen sin verificación local.

## Alcance cubierto

- **Diff completo:** 10 archivos, `7f6917b38a1274a41be5a16f71038709be8edf7a...778068a2c48e70877ccc0c33efdfb81b0b205117`.
- **Rama:** `oliver132123/records-equipo`.
- Los tres archivos fuera de «Archivos probables» son los briefs y la entrega de T-004: documentación justificable de la tarea.
- Sin cambios en migraciones, `lib/records.ts`, `lib/records-form.ts`, `/equipo` ni home, según `git diff --name-only origin/main...HEAD`.
- **Ejecución propia:** `./node_modules/.bin/tsc --noEmit --incremental false` → código **0**, sin salida. Se deshabilitó el incremental para evitar escribir el caché.
- **Ejecución del PM:** typegen, tsc y lint correctos; **11 archivos y 236 tests aprobados**. El hash registrado coincide exactamente con `git rev-parse HEAD`: `docs/pm/tareas/T-004/gate-r1.txt:4`, `:27`, `:55`.
- **No ejecutado:** Vitest, build y navegador por las restricciones de escritura; ninguna consulta remota. El build declarado por el dev no forma parte del gate del PM.
- Estado final igual al inicial: únicamente `gate-r1.txt` sin seguimiento. No se modificaron archivos.

**Técnicas aplicadas:**

- Particiones: dueño equipo/miembro; lista vacía/con datos; cifras/hito; vigente/superado; consulta correcta/error.
- Tabla de decisión: dueño nulo → `.is`; dueño numérico → `.eq`; respuesta correcta → datos; error → respaldo público y aviso esperado en panel.
- Transiciones: abrir/cerrar miembro ↔ equipo, cancelar borrador, respuesta tardía después de cambiar de modal.
- Valores límite diseñados para ejecución pendiente: 0/1/varios récords y viewport de 400 px con textos extensos.
- Caja blanca: revisión de ramas por dueño, respaldos, guardas de `miembro` y cobertura de los tests.
- Error guessing: errores silenciosos, doble envío, concurrencia e hidratación.

## Trazabilidad de criterios

«CUMPLE» indica comprobación estática cuando se especifica; no acredita una ejecución visual.

| CA | Resultado | Evidencia |
| -- | --------- | --------- |
| CA-1 | CUMPLE — estático | `lib/datos.ts:167`: firma requerida, `.is('miembro_id', null)`, `consultar`, respaldo `[]` y `ordenarRecords`. La prueba real de filtrado sigue pendiente. |
| CA-2 | NO VERIFICABLE — integral | Botón en `app/(admin)/(panel)/admin/miembros/MiembrosAdmin.tsx:256`; dueño nulo y alta en `RecordsModal.tsx:93` y `:186`; `lib/records-form.ts:147` conserva `miembro_id`. CRUD local no ejecutado; además, D02 afecta la lectura. |
| CA-3 | NO VERIFICABLE — integral | Estados separados y actualización por dueño en `app/(admin)/(panel)/admin/miembros/MiembrosAdmin.tsx:228`; instancias separadas en `:554` y `:569`. Falta comprobar ambos sentidos y respuestas tardías con datos reales. |
| CA-4 | CUMPLE — estático | `app/(sitio)/nosotros/page.tsx:120`, `:139` y `:147`: números → componente `Records` → valores. |
| CA-5 | CUMPLE — estructura estática | `app/(sitio)/nosotros/page.tsx:139` excluye toda la sección cuando no hay datos; el diff no modifica el contenido anterior. Comparación visual local pendiente. |
| CA-6 | CUMPLE — estático | `app/(sitio)/nosotros/page.tsx:68` usa `Promise.all`; ambos accesos tienen respaldo: `lib/datos.ts:167`, `:257`; errores y excepciones se capturan en `lib/supabase.ts:48`. |
| CA-7 | CUMPLE — estático | `app/(sitio)/nosotros/page.tsx:64` conserva la comprobación antes de las consultas. Uso consistente con la guía local `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/not-found.md`. |
| CA-8 | NO VERIFICABLE | No hay evidencia de navegador a 400 px con datos ni de consola de hidratación; la entrega lo reconoce en `docs/pm/tareas/T-004/entrega-dev.md:185`. |

La búsqueda de accesos a `miembro` en el modal encontró únicamente `miembro?.id` y `miembro.nombre` dentro de una condición que comprueba `miembro`: `RecordsModal.tsx:93` y `:252`. No encontré una desreferencia nula en esos accesos.

## Defectos

### T-004-D01 — Los tests nuevos sustituyen la capa de datos prohibida por el canon

- **Severidad / Prioridad:** S3 / P1.
- **Área:** testware.
- **Ubicación:** `tests/unidad/datos.test.ts:85`, `:92`, `:105`.
- **Pasos / condición:** Ejecutar los tres tests de `getRecordsEquipo`.
- **Esperado:** Respetar `docs/pm/contexto.md:78`: no mockear la capa de datos; comprobar el filtrado real contra Postgres local.
- **Obtenido:** Se reemplaza `createClient`, `from`, `select`, `eq` e `is` por una consulta artificial que devuelve la respuesta prefijada.
- **Evidencia:** `then: (...) => resolver(respuesta)` en `:102` devuelve los mismos datos independientemente del filtro. Las filas de ordenación tampoco incluyen `miembro_id` (`:137`).
- **Sugerencia:** Verificar separación y filtrado con Postgres local real. Para pruebas del transporte, conservar el SDK real y simular únicamente HTTP, sin presentar eso como validación de base.
- **Introducido por:** este cambio; existen mocks anteriores, pero este diff añade otros.
- **Motivo de P1:** incumple una convención explícitamente no negociable de la base de prueba; bloquea el cierre del gate de QA.

### T-004-D02 — Un error al cargar récords del equipo se presenta como lista vacía

- **Severidad / Prioridad:** S3 / P2.
- **Área:** ui / datos.
- **Ubicación:** `app/(admin)/(panel)/admin/miembros/page.tsx:18`, `:32`.
- **Pasos / condición:** La consulta de récords devuelve `{ data: null, error: ... }`; abrir «Récords del equipo».
- **Esperado:** Mostrar que la lectura falló, conforme al checklist de errores visibles; distinguir fallo de ausencia de registros.
- **Obtenido:** Se descarta `error`, se convierte `null` en `[]` y el modal anuncia «Todavía no hay récords del equipo cargados».
- **Evidencia:** La desestructuración recoge exclusivamente `data`; `recordsEquipo ?? []` llega al estado del panel y activa el mensaje vacío de `RecordsModal.tsx:445`.
- **Sugerencia:** Propagar el estado de error al panel y ofrecer recuperación, conservando la distinción entre lista vacía y lectura fallida.
- **Introducido por:** este cambio para la consulta del equipo; el patrón ya existía en la consulta de miembros.

### T-004-D03 — Falta la evidencia local obligatoria de aceptación

- **Severidad / Prioridad:** S3 / P2.
- **Área:** proceso / testware.
- **Ubicación:** `docs/pm/tareas/T-004/entrega-dev.md:35`, `:172`.
- **Pasos / condición:** Contrastar la trazabilidad de la entrega con las pruebas requeridas.
- **Esperado:** Evidencia manual y visual local con cifras, hito, aislamiento y estado vacío, exigida en `docs/pm/tareas/T-004/brief-dev.md:65`.
- **Obtenido:** La entrega explica «cómo se cumple» cada CA, pero admite que no ejecutó la verificación manual y deja CA-2, CA-3 y CA-8 pendientes. El HTML sin registros no demuestra la presentación con registros.
- **Evidencia:** Reconocimiento explícito en `entrega-dev.md:172` y `:185`; la definición de hecho exige evidencia por CA en `brief-dev.md:73`.
- **Sugerencia:** Completar las pruebas en entorno local y actualizar la trazabilidad diferenciando inspección estática de ejecución.
- **Introducido por:** esta entrega. Es una carencia de evidencia reconocida, no evidencia de que los flujos necesariamente fallen.

## Evaluación de los tests del dev

- El test de filtro **fallaría al cambiar `.is` por `.eq`**, porque comprueba el método registrado (`tests/unidad/datos.test.ts:131`). Detecta esa mutación, pero no demuestra el aislamiento real.
- El test de orden **fallaría al eliminar `ordenarRecords`**: espera `[3,4,1,2]` para la entrada `[1,2,3,4]` (`:137`, `:147`).
- El test de error es débil: usa `data: null` (`:153`). Podría seguir pasando si se ignorara `error` y solo se aplicara el respaldo por datos nulos.
- Ningún test añadido monta el modal ni ejecuta sus ramas de alta, edición, superado, borrado o cambio de dueño. Los tres casos nuevos se limitan a `getRecordsEquipo` (`:122`).

## Riesgos y preguntas

- **Concurrencia:** `alternarVigente` y `borrar` no usan el candado de `guardar` (`RecordsModal.tsx:149`, `:212`, `:230`). Comprobar respuestas desordenadas y alternar mientras se borra; no afirmo corrupción sin ejecución.
- **Evidencia del build:** cero mensajes `[supabase]` no prueba por sí solo que hubiera cero filas; únicamente acredita ausencia de esos mensajes. La inferencia aparece en `entrega-dev.md:36`.
- **Entorno pendiente:** la entrega declara una instrucción anterior de no escribir datos (`entrega-dev.md:174`). El PM debe resolver cómo ejecutar la aceptación local; no corresponde sustituirla por escrituras en producción.
- No aparecen nuevas tablas, RPC, secretos, hosts, redirecciones ni operaciones de Storage en el diff; esos puntos del checklist no agregan superficie nueva en esta tarea.

## Pruebas a ejecutar por el PM

Solo contra un entorno configurado para **Supabase local**:

1. `npx supabase start` y `npm run dev` — preparar datos locales: equipo, miembro A y miembro B. No ejecutado aquí porque requiere escritura.
2. Panel: crear cifra e hito del equipo; editar, marcar superado/vigente y borrar. Verificar en Postgres `miembro_id IS NULL`; repetir con un miembro y comprobar su ID.
3. Abrir miembro → cerrar → equipo y viceversa, con borradores y respuestas demoradas. Comprobar título, formulario, lista y contadores; ningún registro debe cambiar de dueño.
4. Provocar un fallo de lectura del equipo: comprobar el aviso del panel tras corregir D02. Provocar separadamente fallos públicos de récords y ajustes: `/nosotros` debe conservar su respaldo.
5. Comparar `/nosotros` vacío con la base; después probar cifras, hitos y solo superados a **400 px**. Verificar ausencia de scroll horizontal y errores de hidratación, y ubicación antes de «Valores».
6. Apagar `nosotros` localmente y comprobar 404, contemplando la revalidación.
7. `npm run build` y `npm test` tras las correcciones — adjuntar resultados asociados al nuevo `HEAD`; el gate actual solo acredita la revisión presente.