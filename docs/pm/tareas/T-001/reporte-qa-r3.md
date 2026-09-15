# Reporte QA T-001 — ronda 3

**Veredicto:** PASS-WITH-RESERVATIONS
**Resumen:** D01 conserva FIXED; D02 y D03 quedan FIXED con código y evidencia SQL del PM. CA-1..CA-14 mantienen CUMPLE y no se detectan regresiones funcionales ni defectos P1. Quedan un defecto menor de trazabilidad documental (D04, S3/P3) y riesgos exploratorios Unicode e integración, sin exigir otra ronda de implementación.

## Alcance cubierto

- Test Analyst independiente; target solo lectura: `/Users/oliverinfante/orca/workspaces/lainfanteria-next/lainfanteria-next-records-schema`, rama verificada `oliver132123/records-schema`.
- Diff completo revisado: `19a5931..fb269cfbc0791c04dcb5cf8043f4c7cabaa4a185`, cuatro archivos, 223 inserciones y 63 eliminaciones: migración 0013, brief dev, entrega dev y gate r3. Sin cambios en aplicación ni tests.
- Base de prueba: `brief-qa.md`, contexto, épica, brief dev sección 6, entrega r3, reporte r2, pruebas PM r1/r2 y gates r1/r3. Las referencias abreviadas a reportes, briefs y gates pertenecen a `docs/pm/tareas/T-001/`; `0013_records.sql` pertenece a `supabase/migrations/`.
- Identidad del gate: `gate-r3.txt:4` registra `3e54d8b51c4d5eeedca964af106250b12af96e31`, distinto del HEAD revisado. `git diff 3e54d8b..HEAD --stat` devuelve exclusivamente `gate-r3.txt`, 120 inserciones: código, migración y tests ejecutados equivalentes al HEAD, sin afirmar igualdad literal de hashes.
- Técnicas ISTQB: confirmation testing, regresión por análisis de impacto, particiones de equivalencia (blancos/texto; null/NaN/positivo/no positivo), valores límite, revisión de condiciones SQL, tabla de decisión 3×4 conservada y error guessing Unicode. Niveles: componente, compilación e integración DB/API mediante evidencia del PM.
- Ejecutado por QA: `npx tsc --noEmit --incremental false` → exit 0, sin salida. Comparación Python en memoria de la migración base y HEAD → `PASS: 8 nombres de CHECK conservados; SQL restante idéntico al quitar comentarios y los 3 CHECK autorizados.` Revisión manual coincide con el único hunk SQL.
- Ejecución atribuida al PM: typegen OK (`gate-r3.txt:50`), tsc OK (`:55`), lint OK (`:63`), 7 archivos y 135/135 unitarias (`:75`), aplicación completa de 0013 en esquema temporal y catálogo de CHECKs (`:82`), ALTER de CHECKs en base compartida y 11 filas existentes válidas (`:93`), 15 bordes SQL (`:100`), 49/49 seguridad local (`:118`). El ROLLBACK del esquema temporal no debe confundirse con el ALTER posterior: este último sí fue COMMIT por el PM.
- QA no ejecutó SQL, no contactó Supabase local/remoto y no corrió herramientas que escriben cachés o generan archivos. `git status --short` del target vacío antes y después. Única escritura: este reporte fuera del target, sin commit.

## Confirmación de defectos anteriores

| ID | Estado | Evidencia |
| -- | ------ | --------- |
| T-001-D01 (S3/P3) | **FIXED** | `tests/unidad/records.test.ts:95` conserva 12 filas; `:206` usa it.each; `:210` y `:211` verifican marca literal y booleano literal. Negativos con mph en `:114`, `:150`, `:186`. Archivo idéntico a cierre r2; `gate-r3.txt:76` confirma 135/135. |
| T-001-D02 (S3/P2) | **FIXED** | `0013_records.sql:61` exige `titulo ~ '[^[:space:]]'`, con explicación en `:57`. Catálogo real en `gate-r3.txt:89`; tab, LF, CR y U+00A0 rechazados con 23514 y `records_titulo_no_vacio` en `:101`, `:102`, `:103`, `:104`; vacío y espacios también rechazados en `:105`, `:106`. Texto con blancos aceptado en `:107`, `:108`. |
| T-001-D03 (S3/P2) | **FIXED** | `0013_records.sql:66` y `:68` añaden exclusión explícita de NaN conservando null y >0. Catálogo en `gate-r3.txt:88` y `:91`; NaN en tiempo y velocidad da 23514 con el constraint correspondiente en `:109`, `:110`. Positivos aceptados en `:111`, `:113`, `:115`; cero/negativo rechazados en `:112`, `:114`. |

### Oráculos y límites de la evidencia

- **Sí**, según la ejecución registrada de esta base, `[:space:]` cubre tab, LF, CR y NBSP/U+00A0. No se extrapola esa evidencia a cualquier configuración de Postgres ni a todos los caracteres Unicode. `pruebas-pm-r2.txt:17` y `:18` solo acreditan la aceptación antigua de tab/LF; la evidencia de rechazo actual es el gate r3.
- Se conservan `' x '` y tab+texto (`gate-r3.txt:107`, `:108`), y `0.001 s` (`:111`). El patrón exige un carácter fuera de la clase: no elimina blancos alrededor ni modifica el título.
- `0.01` de velocidad fue aceptado (`gate-r3.txt:113`); esa línea no imprime la unidad. La combinación exacta **0.01 mph** es válida por inspección conjunta del enum (`0013_records.sql:22`), tipo numeric (`:40`) y CHECKs (`:68`, `:72`), pero no se atribuye al gate un payload mph no publicado. La combinación 9.874 s + 142.5 mph sí está explícita en `gate-r3.txt:115`.
- La aceptación de null sigue explícita en ambos CHECKs; velocidad null requiere unidad null. No se cambió el contrato de hitos.
- Sensibilidad del testware: antes del fix, tab/LF y ambos NaN daban INSERT (`pruebas-pm-r2.txt:17` a `:20`); después dan 23514 por el CHECK esperado, no un 42501 incidental. Revertir los CHECKs restauraría esas aceptaciones. Los 135 tests TS y los 49 de permisos, por sí solos, no prueban estos invariantes SQL; no hay mocks de DB ni tests nuevos, conforme al brief.

## Regresión del diff

- El único cambio SQL es en los tres CHECK autorizados y sus comentarios (`0013_records.sql:57`). No cambia ninguna columna, enum, default, FK, otro CHECK, política, grant ni índice. Tampoco cambian los `comment on column`.
- Los ocho nombres de constraint son idénticos entre base y HEAD. Se conservan `records_titulo_no_vacio`, `records_tiempo_positivo`, `records_velocidad_positiva`, `records_velocidad_con_unidad`, `records_anio_razonable`, `records_mes_valido`, `records_mes_con_anio` y `records_fuente_url_http`; catálogo r3 concordante (`gate-r3.txt:84`).
- RLS (`0013_records.sql:127`), lectura equipo/activo (`:129`), admin (`:135`, `:138`), grants (`:142`) e índices (`:114`, `:118`) intactos. Comparados con el patrón de logros (`0011_logros_estructurados.sql:200`); se conserva la excepción intencional de lectura del equipo.
- Los cinco CHECK no modificados conservan evidencia aplicable: pareja velocidad/unidad en `gate-r1.txt:169`, años/meses/URL en `pruebas-pm-r2.txt:6` a `:27`. El catálogo r3 prueba su presencia actual; no se afirma que todos se reejecutaron en esta ronda.
- Documentación actualizada para explicar la ronda y el despliegue. `entrega-dev.md:90` mantiene inequívoco db push ANTES del merge (aunque escriba «REQUIRE»); `:95` aporta rollback. No hay motivo para convertir esa errata en un bloqueo de deploy.

## Trazabilidad de criterios

CUMPLE significa evidencia suficiente estática y/o dinámica, conservando el criterio de rondas anteriores; no implica ejecución de toda ampliación exploratoria.

| CA | Resultado | Evidencia actualizada |
| -- | --------- | -------------------- |
| CA-1 | CUMPLE | `0013_records.sql:28`, `:43`, `:61`, `:66`, `:68`; aplicación completa y ocho CHECK reales en `gate-r3.txt:82`; 15 bordes en `:100`. Sin default en alcance; pruebas heredadas de los CHECK no modificados indicadas arriba. |
| CA-2 | CUMPLE | `0013_records.sql:129` deja equipo y miembros activos; transición activo→inactivo→activo preservada en `pruebas-pm-r1.txt:27`; bloque idéntico. |
| CA-3 | CUMPLE | Grants `0013_records.sql:142`; payload real `tests/seguridad/rls.test.ts:54`, filtro `:67`, oráculos 42501 `:105`, `:120`, `:126`; 49/49 actuales en `gate-r3.txt:120`. |
| CA-4 | CUMPLE | `0013_records.sql:135`, `:138`, `:143`; using y with check con es_admin intactos. CRUD admin y rechazo/no mutación no-admin en `pruebas-pm-r1.txt:12`, `:20`, `:32`; evidencia heredada para políticas sin cambios. |
| CA-5 | CUMPLE | FK nullable ON DELETE CASCADE `0013_records.sql:33`; borrado sin afectar equipo en `gate-r1.txt:185`; FK intacta. |
| CA-6 | CUMPLE | Índices `0013_records.sql:114`, `:118`, catálogo `gate-r1.txt:190`; sin cambios. |
| CA-7 | CUMPLE | `lib/types.ts:62`, `:68`, `:75`, `:132`; sin cambios y tsc independiente exit 0. |
| CA-8 | CUMPLE | `lib/records.ts:32`, `:39`, `:49`, `:60`; implementación/tests intactos, `gate-r3.txt:76` 135/135. |
| CA-9 | CUMPLE | `lib/palmares.ts:47`, firma Pick sin cambios; consumidores compilados por tsc y suite global verde. |
| CA-10 | CUMPLE | `lib/records.ts:68`; oráculos conservados en `tests/unidad/records.test.ts:210`, `:211`; 135/135. |
| CA-11 | CUMPLE | `lib/records.ts:11`, `:76`; tres ramas y hito nacional conservados en bloque `tests/unidad/records.test.ts:216`; gate verde. |
| CA-12 | CUMPLE | `lib/records.ts:87`: copia y todos los desempates preservados; tests de orden y no mutación intactos y verdes. |
| CA-13 | CUMPLE | `lib/records.ts:102`, `:110`; filtros estables sin cambios y pruebas preservadas, 135/135. |
| CA-14 | CUMPLE | `lib/datos.ts:62`, `:94`, `:115`: relación, orden, fallback y palmares intactos. Consulta real y build local heredados de `pruebas-pm-r1.txt:37` a `:46`; tsc actual verde. Ampliación de fixtures pendiente, sin atribuir ejecución ausente. |

## Defectos

### T-001-D04 — La entrega atribuye pruebas a referencias que no las contienen

- **Severidad / Prioridad:** S3 / P3 (testware documental débil; no bloquea merge).
- **Área:** documentación / trazabilidad de pruebas.
- **Ubicación:** `entrega-dev.md:30`, `:50`, `:113`.
- **Pasos / condición:** contrastar las afirmaciones de ejecución con `pruebas-pm-r2.txt` citado.
- **Esperado:** distinguir pruebas ejecutadas, inferencias y evidencia de otras rondas.
- **Obtenido:** `:17-18` registra aceptación antigua de tab/LF, no clasificación de CR/NBSP ni rechazo por regex; `:24` prueba 100000, no Infinity; el archivo tampoco registra pruebas de pareja velocidad/unidad.
- **Evidencia:** `pruebas-pm-r2.txt:17`, `:18`, `:24` y contenido completo del archivo; el respaldo correcto de blancos está en `gate-r3.txt:101`, y el de pareja velocidad/unidad en `gate-r1.txt:169`.
- **Sugerencia:** corregir las referencias en una actualización documental posterior y presentar Infinity como razonamiento del brief, no como prueba ejecutada de ese valor. No se solicita alterar SQL ni una ronda 4.
- **Introducido por:** documentación de esta ronda. No invalida D02/D03, cuyo cierre tiene respaldo independiente en el gate r3.

## Riesgos y preguntas (sin evidencia suficiente para defecto)

- **P3 — Dominio Unicode restante:** U+2003 y U+200B no aparecen en los 15 bordes de `gate-r3.txt:100`. No se afirma que la base los acepte ni rechace. El CHECK depende exclusivamente de su clasificación por `[:space:]`; no hay prohibición explícita separada para caracteres visualmente vacíos. Hace falta definir el oráculo de U+200B y registrar la configuración de clasificación/collation antes de generalizar. Si una entrada fuera de esa clase produce un título visualmente vacío, sería un riesgo funcional; hoy no hay reproducción suficiente para D05 ni evidencia de P1.
- **P3 — Evidencia SQL resumida:** el gate registra salidas y catálogo, pero no el script completo ni todos los payloads, incluida la unidad de 0.01. Esto limita reproducción exacta y portabilidad; no invalida los rechazos identificados por SQLSTATE/constraint. No sustituir una prueba PostgreSQL por regex de Python/JavaScript para resolver Unicode.
- **P3 — Integración CA-14:** permanece sin salida final de ambas funciones con todos los fixtures: orden, miembro sin hijos, inactivo y palmares no vacío (`pruebas-pm-r2.txt:33`). Consulta embebida/build y código sí están respaldados.
- Redondeo de empates y submínimos siguen fuera de esta ronda según `brief-dev.md`, sección 6; no se añaden condiciones ni tests. El build funcional se hereda de r1 por ausencia de cambios de aplicación; no se presenta como build nuevo.
- El orden db push → seguridad → merge/deploy → smoke sigue pendiente del responsable de despliegue. QA no aplicó ni verificó nada remoto.

## Pruebas a ejecutar por el PM

Ampliaciones P3, sin bloqueo para cerrar D02/D03 y únicamente en un entorno local disponible, sin interferir con otros devs:

1. Registrar una consulta de clasificación: `SELECT U&'\2003' ~ '[^[:space:]]' AS em_space_tiene_no_blanco, U&'\200B' ~ '[^[:space:]]' AS zwsp_tiene_no_blanco;` y la configuración/collation efectiva; acordar primero el resultado de dominio de U+200B. Luego, si procede, INSERT de cada título aislado y con texto, con SQLSTATE/constraint y ROLLBACK.
2. Si se amplía el registro de bordes, incluir el payload completo de `(titulo, velocidad, unidad_velocidad) = ('mínimo válido', 0.01, 'mph')`: esperado INSERT; no es requisito para reabrir esta ronda.
3. Completar fixtures reales de getMiembros/getMiembro: orden final, [] sin hijos, exclusión de inactivos y palmares no vacío conservado. No repetir consulta cruda/build sin cambios que lo justifiquen.

**Cierre de ronda 3 de 3:** no hay FAIL ni P1 y no corresponde abrir ronda 4. El PM recibe el veredicto con D01/D02/D03 cerrados y follow-ups P3; si apareciera un bloqueo de merge posterior, corresponde replantear la tarea con el PM.
