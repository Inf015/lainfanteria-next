# Reporte QA T-011 — ronda 3

**Veredicto:** FAIL  
**Resumen:** D01, D02 y D03 quedan **FIXED**. La revisión encuentra D04: cerrar y reabrir durante una operación pierde su aviso de error si esta falla después del desmontaje; incumple CA-8 y CA-9. El gate corresponde al HEAD actual y registra 269 pruebas aprobadas.

## Alcance cubierto

- **Diff completo revisado:** 19 archivos, `38141fb1e8e6bbc78225ef2e20e50438c3833278...f3d99dfbad5bfdd7f45b5d7dd33c7c3e3e8c4539`.
- **Rama comprobada:** `oliver132123/fotos-orden`.
- **Fuera de “Archivos probables”:** 11 documentos de seguimiento, justificados por el proceso del PM; los otros dos archivos son los padres, autorizados por §7 del brief. En ambos, el diff modifica exclusivamente `actualizarFotos`.
- **Alcance protegido:** `0012_foto_principal_atomica.sql` y `lib/datos.ts` no aparecen modificados. La fila T-012 del tablero es seguimiento documental, sin implementación.
- **Técnicas:** particiones de equivalencia, valores límite, tabla de decisión, transiciones de estados —incluidos desmontaje, remontaje y error tardío—, revisión de ramas, confirmation testing, regresión y error guessing.
- **Ejecutado aquí:** `./node_modules/.bin/tsc --noEmit --incremental false` → **exit 0**, sin salida. Se desactivó incremental para evitar escritura de caché.
- **Gate del PM:** HEAD idéntico al actual (`gate-r3.txt:4`); typegen, tsc y lint correctos; **269 tests / 12 archivos aprobados** (`gate-r3.txt:52`, `:58`, `:62`, `:80`).
- **Vigencia del navegador:** registra `38705a8` (`pruebas-pm-r3.txt:19`). `git diff --stat 38705a8 HEAD` muestra exclusivamente 69 líneas añadidas al informe de pruebas: no cambió código.
- **Vigencia del SQL:** `git diff 7d70f6f HEAD -- supabase/migrations/0014_reordenar_fotos.sql` no produce diferencias.
- **No ejecutado aquí:** Vitest, build, navegador ni Supabase; requieren escritura o servicios fuera del sandbox autorizado. No se contactaron servicios remotos.
- **Estado final:** igual al inicial: únicamente `?? docs/pm/tareas/T-011/gate-r3.txt`.

Referencias abreviadas: los documentos están en `docs/pm/tareas/T-011/`; `SubirFotos.tsx`, en `app/(admin)/(panel)/admin/_componentes/`; los padres, en `autos/` y `productos/` del mismo panel. `0014` y `0012` designan sus respectivas migraciones.

## Trazabilidad de criterios

“CUMPLE” combina revisión estática y evidencia ejecutada del PM donde se indica; no significa ejecución propia de navegador o SQL.

| CA | Resultado | Evidencia |
| -- | --------- | --------- |
| CA-1 | CUMPLE | Autorización inicial, `security definer`, path fijo y permisos: `0014:59`, `:68`, `:207`. Rechazo anon/no admin: `pruebas-pm-r1.txt:9`. |
| CA-2 | CUMPLE | Allowlist devuelve la columna (`0014:74`); identificadores con `%I` (`:124`, `:169`, `:182`). Tablas inválidas: `pruebas-pm-r1.txt:13`. |
| CA-3 | CUMPLE | Clave idéntica en `0014:114` y `0012:67`. Espera entre sesiones reales: `pruebas-pm-r1.txt:50`. |
| CA-4 | CUMPLE | Bloqueo, unicidad, pertenencia y cardinalidad: `0014:124`, `:131`, `:139`, `:148`. Casos negativos: `pruebas-pm-r1.txt:15`; multidimensionales: `pruebas-pm-r2.txt:4`. |
| CA-5 | CUMPLE | Retorno previo a UPDATE (`0014:155`); ejecución vacía correcta (`pruebas-pm-r1.txt:39`). |
| CA-6 | CUMPLE | Baja previa de principal, ordinalidad y control de filas: `0014:169`, `:182`, `:194`. Resultados SQL: `pruebas-pm-r1.txt:31`; límite inferior cero: `pruebas-pm-r2.txt:6`. |
| CA-7 | CUMPLE | Repetición sin cambios ni error: `pruebas-pm-r1.txt:33`, `pruebas-pm-r2.txt:9`. |
| CA-8 | **NO CUMPLE** | Movimiento, bloqueo, rollback, drag, teclado y táctil tienen evidencia favorable (`pruebas-pm-r3.txt:50`). **D04:** el error de una RPC pendiente se pierde al remontar (`SubirFotos.tsx:83`, `:225`, `:328`). |
| CA-9 | **NO CUMPLE** | DELETE → RPC → bucket → publicación está implementado (`SubirFotos.tsx:273`, `:296`, `:315`, `:320`) y probado con fallos (`pruebas-pm-r3.txt:33`, `:72`). **D04:** el aviso exigido desaparece si la instancia fue desmontada. |
| CA-10 | CUMPLE | Primera inserción principal y agregado al final (`SubirFotos.tsx:162`, `:170`, `:187`). Galería vacía y lote parcialmente fallido ejecutados: `pruebas-pm-r3.txt:38`. |
| CA-11 | CUMPLE | Ayuda completa solicitada: `SubirFotos.tsx:453`. |
| CA-12 | CUMPLE | Publicaciones y rollback dirigidos al registro correcto: `AutosAdmin.tsx:197`, `ProductosAdmin.tsx:174`. Pantalla/base tras remontaje: `pruebas-pm-r3.txt:23`; tras borrado fallido: `:33`. |
| CA-13 | **NO CUMPLE integralmente** | SQL y movimiento en productos comprobados (`pruebas-pm-r2.txt:8`, `pruebas-pm-r3.txt:77`); comparte D04 mediante `SubirFotos` (`ProductosAdmin.tsx:392`). A/B en productos siguen sin ejecución registrada (`pruebas-pm-r3.txt:86`). |

### Tabla de decisión de CA-4

Precondiciones: admin, tabla permitida y padre no nulo.

| Entrada | Resultado |
| -- | -- |
| `NULL` / contiene `NULL` | `22004` |
| `{}` con galería vacía | Éxito sin UPDATE |
| `{}` con galería no vacía | `23514` |
| Repetidos, incluso compensando un faltante | `23505` |
| Uno de menos | `23514` |
| Uno de más ajeno | `23503` |
| Sustitución por ID de otro padre | `23503` |
| ID de otra tabla ausente de la galería objetivo | `23503` |
| ID inexistente | `23503` |
| Multidimensional | `2202E` |
| Permutación exacta, incluido límite inferior cero | Éxito; orden consecutivo y primera posición real principal |

Evidencia: `0014:96`, `:104`, `:131`, `:139`, `:148`; `pruebas-pm-r1.txt:15`, `pruebas-pm-r2.txt:4`.

Sin repetidos, todos pertenecientes e igual cardinalidad implica igualdad de conjuntos. Todos los rechazos preceden al primer UPDATE. La comparación con 0012 mantiene autorización, allowlist, formato de identificadores, permisos y clave del lock; las diferencias agregan validación del arreglo completo y asignación por ordinalidad. La baja previa evita colisionar con el índice parcial; una excepción por filas afectadas revierte ambos UPDATE (`0014:169`, `:196`).

## Confirmación de defectos anteriores

| ID | Estado | Evidencia |
| -- | ------ | --------- |
| T-011-D01 | **FIXED** | Registro de módulo por `tabla:registroId`, desuscripción sin liberación y exclusión hasta finalizar (`lib/galeria.ts:147`, `:161`, `:180`, `:191`). Todas las operaciones pasan por la guardia (`SubirFotos.tsx:108`, `:128`, `:211`, `:255`). Padres actualizan funcionalmente por ID. PM confirma mismo auto y otro auto (`pruebas-pm-r3.txt:23`). |
| T-011-D02 | **FIXED** | Lecturas exigen éxito HTTP, precondición ≥2 fotos e inversión real (`tests/seguridad/rls.test.ts:220`, `:239`, `:251`, `:256`). PM registra 50 aprobadas con datos y fallo explícito sin precondición (`pruebas-pm-r3.txt:9`). |
| T-011-D03 | **FIXED** | `onCambio(quedaron)` en `finally` después del DELETE (`SubirFotos.tsx:319`). Bucket fallido y renormalización fallida no reintroducen la foto (`pruebas-pm-r3.txt:33`, `:72`). |

## Defectos

### T-011-D04 — Los errores de operaciones pendientes se pierden al cerrar y reabrir la galería

- **Severidad / Prioridad:** **S2 / P1**.
- **Área:** ui / ciclo de vida / manejo de errores.
- **Ubicación:** `SubirFotos.tsx:83`, `:225`, `:302`, `:328`; `AutosAdmin.tsx:296`; `ProductosAdmin.tsx:267`.
- **Pasos / condición:**
  1. Abrir una galería con al menos dos fotos.
  2. Iniciar un movimiento y mantener pendiente su RPC.
  3. Cerrar el modal y reabrir el mismo registro antes de resolverla.
  4. Resolver la RPC con error.
  5. Variante: borrar la principal, completar el DELETE y mantener pendiente la renormalización; cerrar/reabrir y hacer fallar esa RPC.
- **Esperado:** CA-8 exige rollback **y aviso**; CA-9 exige aviso cuando falla la renormalización posterior al DELETE. El aviso debe llegar a la galería reabierta.
- **Obtenido:** el padre recibe correctamente el rollback o las fotos restantes, pero el error se asigna al estado de la instancia desmontada. La instancia visible conserva su propio `error = null` y no muestra el fallo.
- **Evidencia:** razonamiento reproducible del flujo:
  - `error` pertenece a cada instancia mediante `useState(null)` (`SubirFotos.tsx:83`).
  - Cerrar elimina el subárbol del modal (`AutosAdmin.tsx:98`, `:296`); productos usa el mismo render condicional (`ProductosAdmin.tsx:267`).
  - La continuación pendiente conserva el `setError` de la instancia anterior (`SubirFotos.tsx:225`, `:229`, `:302`, `:307`).
  - El registro compartido transmite únicamente el estado del candado, no errores (`lib/galeria.ts:138`, `:170`).
  - El aviso visible depende exclusivamente del estado local de la nueva instancia (`SubirFotos.tsx:328`).
  - Los callbacks de los padres transmiten fotos, sin transportar ese error (`AutosAdmin.tsx:190`, `ProductosAdmin.tsx:167`).
- **Sugerencia:** conservar y publicar el resultado de error por galería fuera de la instancia, con una regla explícita de consumo/limpieza. Agregar la transición «operación pendiente → desmontar/remontar → error» a la comprobación manual.
- **Introducido por:** este cambio —nuevas operaciones de reordenamiento y renormalización— en combinación con el cierre preexistente. El fix de r3 conserva candado y publicaciones, pero no los avisos.
- **Límite de comprobación:** confirmado por análisis estático del ciclo de vida; pendiente reproducción en navegador. No se atribuye pérdida adicional de datos: el defecto es la ausencia del aviso obligatorio, incluido el caso residual aceptado de galería sin principal.

## Evaluación de los tests del dev

- Movimiento y normalización verifican resultados, límites e inmutabilidad; no mockean datos (`tests/unidad/galeria.test.ts:24`, `:76`).
- Los tests del registro verifican exclusión entre montajes, independencia de galerías, liberación ante excepción y persistencia tras desuscripción (`tests/unidad/galeria.test.ts:280`).
- Las mutaciones registradas discriminan: candado nuevo por pedido → **1 fallo**; clave sin registro → **3 fallos**; liberar al desuscribir → **1 fallo** (`entrega-dev.md:49`). No se repitieron porque requieren escribir.
- **Revertir solo la integración del componente o de los padres dejaría verdes los tests unitarios del registro.** La entrega reconoce ese límite (`entrega-dev.md:75`). El recorrido del PM sí detectó diez fallas al ejecutarse contra r2 (`pruebas-pm-r3.txt:21`).
- D04 queda fuera de esa cobertura: A/B prueban remontaje con éxito; los errores se comprueban en otros recorridos, sin combinar ambas transiciones (`pruebas-pm-r3.txt:23`, `:33`, `:57`).
- No encontré mocks de la capa de datos en los tests añadidos. La evidencia SQL usa Postgres local real; la inyección de fallos HTTP está documentada por el PM (`pruebas-pm-r1.txt:4`, `pruebas-pm-r2.txt:17`).

## Riesgos y preguntas (sin evidencia suficiente para defecto)

- **Productos:** falta ejecución A/B con cierre/remontaje y cambio de registro; la simetría del código no sustituye esa ejecución (`pruebas-pm-r3.txt:86`).
- **Liberación frente a render:** sigue documentado el intervalo entre soltar el candado y actualizar manejadores; no hay reproducción que demuestre una publicación obsoleta por esa ventana (`entrega-dev.md:209`).
- **Concurrencia externa:** el registro es por pestaña y `FOR UPDATE` protege filas existentes, no inserciones nuevas. No equivale a exclusión de todas las escrituras externas (`lib/galeria.ts:188`, `0014:125`).
- **Borrado no atómico:** riesgo aceptado por CA-9 y comprobado en `pruebas-pm-r3.txt:36`. La entrega actual no vuelve a explicitar ese riesgo; conviene conservarlo allí, sin depender de versiones históricas. D04 es independiente de esa aceptación.
- **Checklist restante:** el diff no introduce tablas, páginas, redirects, hosts, fechas, slugs, secretos ni APIs nuevas de Next. La migración usa `create or replace`; aplicación y reversión están documentadas (`0014:52`, `entrega-dev.md:174`).
- **Cobertura pendiente:** no hay ejecución específica de sesión expirada ni de la defensa `25000` por filas afectadas (`0014:196`).

## Pruebas a ejecutar por el PM

Exclusivamente en entorno local; pendientes porque requieren navegador, escritura o inyección de fallos:

- **D04 en autos y productos:** retrasar una RPC de movimiento, cerrar/reabrir y responder con error. Verificar rollback y aviso en la instancia visible. Repetir con DELETE exitoso y renormalización fallida: borrada ausente y aviso visible.
- **A/B en productos:** repetir cierre/reapertura del mismo producto y apertura de otro durante una subida. Verificar bloqueo por galería, publicación al registro correcto y conservación de campos editados.
- **Sesión expirada y archivo externo sobre la grilla:** comprobar aviso/rollback y que el drop no reordene ni navegue fuera del panel.
- **Tras corregir D04:** repetir `npx next typegen`, `npx tsc --noEmit`, `npm run lint`, `npm test` y el recorrido local de regresión. El gate actual es válido para este HEAD, pero no cubriría un fix posterior.