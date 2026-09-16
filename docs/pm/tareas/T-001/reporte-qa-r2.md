# Reporte QA T-001 — ronda 2

**Veredicto:** PASS-WITH-RESERVATIONS
**Resumen:** T-001-D01 está FIXED: las 12 celdas requeridas tienen oráculos literales y coherencia de tieneCifras, con ejecución verde y sensibilidad comprobada ante cuatro roturas en memoria. Los CA-1..CA-14 mantienen CUMPLE; CA-4 incorpora evidencia dinámica suficiente y CA-14 mejora con consulta embebida/build local, aunque quedan ampliaciones de integración sin evidencia completa. No hay defectos nuevos confirmados; permanecen las reservas de dominio y cobertura detalladas abajo.

## Alcance cubierto

- Analista independiente; objeto de prueba exclusivamente en lectura: `/Users/oliverinfante/orca/workspaces/lainfanteria-next/lainfanteria-next-records-schema`, rama comprobada `oliver132123/records-schema`.
- Diff de ronda revisado: `3ad328e..154d762a4b01fd9ca8947d230e94e6bfadd3f519`, cuatro archivos: `tests/unidad/records.test.ts`, `docs/pm/tareas/T-001/brief-dev.md`, `entrega-dev.md` y `gate-r2.txt`. Ningún cambio de producción, migración, seguridad, dependencias, componente o CSS. `git status --short` vacío antes y después de las comprobaciones.
- Base de prueba: brief QA, contexto, épica, brief dev (incluida sección 6), reporte r1, entrega r2, gate r2, evidencia PM r1 y decisión de redondeo del encargo.
- Identidad del gate: `gate-r2.txt:4` registra `b774c08a9f8b0bbff8ae418426be3af97a370a98`, distinto de HEAD. `git diff b774c08..HEAD --stat` devuelve **solo gate-r2.txt, 106 inserciones**: equivalencia comprobada del código y tests ejecutados, sin afirmar igualdad literal de hashes.
- Identidad de evidencia DB: `pruebas-pm-r1.txt:3` registra `457e9f2ed1233c018110df21a01cf236de3101cc`; `git diff 457e9f2..HEAD --name-only` devuelve únicamente documentación y `tests/unidad/records.test.ts`. Código de aplicación, migración y seguridad permanecen idénticos; la evidencia sigue siendo aplicable.
- Técnicas: tabla de decisión 3×4, particiones de equivalencia, análisis de valores concretos retirados, revisión de ramas, confirmation testing, regresión por diff y mutaciones en memoria; transición de estados y control de acceso mediante evidencia delegada. Niveles: componente, integración DB/API y compilación/build.
- Ejecutado por QA: `npx tsc --noEmit --incremental false` → exit 0, sin salida. Script Node con `typescript.transpileModule` y `vm.runInNewContext`, leyendo implementación y matriz reales, sin archivos auxiliares ni mocks de DB → 12 filas, 12 pares únicos, cero incoherencias del oráculo, cero filas fallidas.
- Ejecutado por PM, atribuido al gate: typegen OK (`gate-r2.txt:21`), tsc OK (`:27`), lint OK (`:31`), 7 archivos y **135/135** unitarias (`:48`), matriz verbose **12 passed / 27 skipped** (`:101`). Los skipped pertenecen al filtro `-t formatearMarca`, no a la suite completa.
- No ejecutados por QA: Vitest/typegen/build/lint que pueden escribir, ni servicios locales/remotos. Supabase local no se tocó. El único archivo creado es este reporte, fuera del worktree; sin commit.

## Confirmación de defectos anteriores

| ID | Estado | Evidencia |
| -- | ------ | --------- |
| T-001-D01 (S3/P3) | **FIXED** | `tests/unidad/records.test.ts:95` contiene 12 filas únicas; `:206` las ejecuta mediante it.each; `:210` compara marca con esperado literal y `:211` compara tieneCifras con booleano literal independiente. Velocidad negativa con unidad válida en `:114`, `:150` y `:186`. `gate-r2.txt:67` presenta las 12 celdas verdes y `:101` confirma 12 passed. |

### Oráculo de las 12 celdas

Cada celda indica marca esperada / tieneCifras y línea de la fila en `tests/unidad/records.test.ts`.

| Tiempo | 142.5 mph | Velocidad nula / unidad null | -1 mph | 142.5 / unidad null |
| -- | -- | -- | -- | -- |
| 9.874 | `9.874 s @ 142.5 mph` / true (:96) | `9.874 s` / true (:105) | `9.874 s` / true (:114) | `9.874 s` / true (:123) |
| null | `142.5 mph` / true (:132) | null / false (:141) | null / false (:150) | null / false (:159) |
| 0 | `142.5 mph` / true (:168) | null / false (:177) | null / false (:186) | null / false (:195) |

Los resultados no se calculan con la implementación bajo prueba; por tanto una rotura compartida por marca y tieneCifras no queda oculta por una comparación circular. Se ejecutaron las mismas filas contra copias de `lib/records.ts` mutadas exclusivamente en memoria:

| Mutación | Filas que detectan el fallo |
| -- | -- |
| Marca devuelve siempre null | 6 |
| Eliminar fallback de velocidad (`return tiempo ?? null`) | 2 |
| Cambiar separador @ por / | 1 |
| Convertir velocidad negativa a absoluta antes de formatearla | 3 |

Esto demuestra sensibilidad a fallos concretos, no cobertura de toda mutación imaginable. Revertir únicamente el arreglo de testware elimina las filas nuevas: D01 no era un bug funcional cuya implementación hubiera cambiado.

### Regresión de casos anteriores

- La única edición del archivo de tests está dentro de `describe('formatearMarca')`. Las otras 27 pruebas del archivo y las suites restantes se conservan; 129 − 6 + 12 = 135.
- **Sí se retiraron entradas concretas:** en `3ad328e:tests/unidad/records.test.ts:94` y `:100`, tiempo 6.12 con velocidad nula/sin unidad; en `:106` y `:112`, velocidad 198 mph con tiempo null/0; en `:121`, tiempo 0 + velocidad 0 + unidad null. Se sustituyen por representantes 9.874, 142.5 y -1 mph. No es exacta la afirmación de entrega de que son todos los mismos casos.
- Se conservan las clases de decisión anteriores (ambas cifras, solo tiempo, solo velocidad, ninguna, ausencia de unidad y tiempo inválido), ampliadas a 12 celdas. El padding sigue probado aisladamente con 10→10.000 s (`tests/unidad/records.test.ts:40`), los ceros de velocidad con 238 km/h y 199.999→200 mph (`:64`), y el cero inválido con unidad en `:79`. No se perdió un CA ni se identificó regresión funcional; la combinación exacta 0/0/null y el padding dentro de marca ya no tienen aserción directa. Es una limitación de representatividad, no un defecto nuevo demostrado.

## Trazabilidad de criterios

CUMPLE conserva el criterio de ronda 1: evidencia suficiente estática y/o dinámica; no significa que toda ampliación exploratoria haya sido ejecutada. Las referencias sin ruta completa a gates y pruebas PM corresponden a `docs/pm/tareas/T-001/`; `0013_records.sql` pertenece a `supabase/migrations/`.

| CA | Resultado | Evidencia actualizada |
| -- | --------- | --------- |
| CA-1 | CUMPLE | Esquema sin cambios: `0013_records.sql:22`, `:28`, `:59`; ejecución heredada `gate-r1.txt:136`, `:168` (migración y CHECKs). Reservas de bordes no ejecutados abajo. |
| CA-2 | CUMPLE | `0013_records.sql:122`, NULL explícito o miembro activo; `gate-r1.txt:181`; ampliación dinámica cerrada por `pruebas-pm-r1.txt:27`: activo→inactivo→activo retira/restituye el récord y conserva el del equipo. |
| CA-3 | CUMPLE | `0013_records.sql:136`, anon solo SELECT; `tests/seguridad/rls.test.ts:99`, `:108`, `:123` exigen 42501; 49 verdes heredadas en `gate-r1.txt:158`, misma migración y suite. |
| CA-4 | CUMPLE | Además de políticas `0013_records.sql:128`, `:131`, `:136`, ahora CRUD real JWT admin: `pruebas-pm-r1.txt:12`, `:17`, `:18`, `:32`; DELETE comprobado en :34. No admin: INSERT 403/42501, PATCH/DELETE sin filas y persistencia intacta (:20). Se cierra la reserva dinámica de permisos. |
| CA-5 | CUMPLE | FK nullable ON DELETE CASCADE (`0013_records.sql:33`); `gate-r1.txt:185`: borrado de miembro elimina solo sus récords, conserva equipo; sin cambios. |
| CA-6 | CUMPLE | Índices `0013_records.sql:107`, `:111`; catálogo `gate-r1.txt:190`; sin cambios. |
| CA-7 | CUMPLE | `lib/types.ts:61`, `:67`, `:74`, `:132`: enums, RecordDeportivo y Miembro.records; tsc independiente exit 0. |
| CA-8 | CUMPLE | `lib/records.ts:32`, `:39`, `:49`, `:60`; tests individuales conservados y matriz completa `tests/unidad/records.test.ts:95`; 135/135 gate y ejecución QA de 12 filas. |
| CA-9 | CUMPLE | `lib/palmares.ts:47`, firma Pick; archivo y consumidores sin cambios; tests palmares incluidos en gate global y tsc independiente verde. |
| CA-10 | CUMPLE | `lib/records.ts:69`, tieneCifras; 12 booleanos literales y aserción en `tests/unidad/records.test.ts:211`, coherencia verificada independientemente. |
| CA-11 | CUMPLE | `lib/records.ts:11`, `:76`; bloque preservado de etiquetas `tests/unidad/records.test.ts:216`, incluido hito nacional. |
| CA-12 | CUMPLE | `lib/records.ts:87`, copia y comparador sin cambios; pruebas de orden/no mutación conservadas y verdes; exploración de 3.136 pares documentada en reporte r1 sigue aplicable. |
| CA-13 | CUMPLE | `lib/records.ts:102`, `:110`, filtros sin cambios; pruebas preservadas de vacío, superado, pista, hitos y orden, gate verde. |
| CA-14 | CUMPLE | `lib/datos.ts:62`, `:94`, `:115`: relación embebida, orden y fallback en ambas funciones, palmares intacto. `pruebas-pm-r1.txt:37` acredita select real con records(*), :38 devuelve tres hijos, :39–46 build local sin PGRST200 ni errores y miembro en prerender. Integración ampliada parcialmente evidenciada: falta salida final ordenada de ambas funciones y fixtures restantes, detallados abajo; no se atribuye al PM esa ejecución ausente. |

## Defectos

Sin defectos nuevos confirmados. T-001-D01 cerrado como FIXED; no se asigna T-001-D02 a una incertidumbre ni a una ampliación de pruebas pendiente.

## Revisión de las pruebas solicitadas al PM en ronda 1

| Solicitud anterior | Evaluación de evidencia |
| -- | -- |
| Repetir seguridad tras fix | No aparece una nueva ejecución en r2; r1 registra 49 verdes. Aceptable para esta ronda exclusivamente de testware: código, seguridad y DB idénticos. Repetir si cambian o en gate de despliegue. |
| Límites SQL y blancos/NaN | `pruebas-pm-r1.txt` no registra esos nuevos intentos ni SQLSTATE/constraint. Gate r1 conserva cobertura parcial, sin cerrar esta ampliación. |
| CRUD admin y no admin | Suficiente para cerrar la reserva de CA-4: respuestas, persistencia y ausencia de mutaciones no autorizadas. Los 200 con [] de PATCH/DELETE no admin son el resultado esperado de RLS, no fallos de la prueba. |
| Transición de actividad | Completada en :27–30; equipo permanece visible. |
| Consulta embebida y build funcional local | Completada para relación y render (:36–46); resuelve el PGRST200 observado antes. No cubre todas las aserciones de salida de funciones solicitadas. |
| Matriz y regresión de unidad | Completada en gate-r2, 12/12 y 135/135. |

## Riesgos y preguntas (sin evidencia suficiente para defecto)

- **Redondeo y submínimos: decisión aceptada del PM en este encargo.** `0013_records.sql:38` y `:40` almacenan escalas 3 y 2; `lib/records.ts:41` y `:56` muestran esas mismas escalas. No se encontró un valor finito persistible que contradiga la decisión: 1.0005 y 1.005 no conservan esa precisión en sus columnas, y 0.001 mph queda fuera de velocidad positiva persistible. No se agregaron tests de empates ni submínimos. El rechazo de exceso de decimales del panel es requisito de T-002, no implementación verificada aquí.
- **Integración restante de CA-14:** `pruebas-pm-r1.txt:38` declara expresamente el orden de base sin ordenar; `palmares: 0` no prueba que se preserva un palmarés no vacío. Tampoco muestra salida final de getMiembro, [] en miembro sin hijos ni exclusión de miembro inactivo en ambas funciones. Código y unidad respaldan CUMPLE, pero estas ampliaciones siguen pendientes.
- **Dominio de blancos/numeric especiales:** permanece la pregunta r1 sobre tabulaciones, saltos de línea y NaN. `0013_records.sql:59`, `:61`, `:62` no cambiaron; no hay nueva evidencia SQL ni acuerdo de dominio en el archivo PM para cerrar esa reserva. No se ensayó contra la base compartida.
- **Deploy:** permanece la exigencia REQUIERE db push ANTES del merge en entrega r2, sección Migraciones; el rollback sigue localizable por la referencia explícita al commit 0c31693. El build local verde no acredita una migración remota ni autoriza deploy.

## Pruebas a ejecutar por el PM

Sin bloqueo para cerrar D01. Estas ampliaciones quedan exclusivamente para entorno local cuando el PM disponga de la base, sin interferir con otros devs:

- Ejecutar getMiembros() y getMiembro(slug) contra fixtures reales y registrar sus resultados: records en orden esperado, [] sin hijos, miembro inactivo excluido (null en getMiembro), palmares no vacío conservado y ordenado. La consulta cruda y el build ya no necesitan repetirse salvo cambio de código/esquema.
- Completar la exploración SQL solicitada en r1: años 1949/1950/2100/2101, meses 0/1/12/13 y mes sin año; título vacío/espacios/tabulaciones/salto de línea; cifras NaN/cero/negativas; URL HTTPS, javascript y espacio inicial. Registrar SQLSTATE y constraint, acordando antes el oráculo de tabulaciones/NaN. Usar transacción con rollback y entorno disponible.
- Mantener el gate de seguridad y smoke del plan de despliegue cuando corresponda. No hay solicitud de añadir pruebas de empates o submínimos en T-001.
