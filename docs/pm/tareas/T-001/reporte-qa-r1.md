# Reporte QA T-001 — ronda 1

**Veredicto:** PASS-WITH-RESERVATIONS
**Resumen:** Los CA-1..CA-14 cumplen por revisión estática, exploración de funciones puras y evidencia de ejecución del PM, con las limitaciones indicadas abajo. Un defecto de testware S3/P3; ninguno S1, S2 o S4. No se modificó el objeto de prueba ni se accedió a servicios remotos.

## Alcance cubierto

- Diff revisado completo: 12 archivos, `40d597876a8188d6af6ed58af844239ac45f7b4c...be34a045938a48aaf2e4bba03579a81540367326`, rama `oliver132123/records-schema`. Working tree limpio al inspeccionarlo.
- Leídos en orden brief QA, contexto, brief dev, entrega y gate; además la épica y las migraciones 0011 y 0006. La base contiene 0012 (`git log` devuelve `b5c66a7` y `d28d595`).
- Identidad del gate: `gate-r1.txt:4` registra `0c3169377c4e7ccdf0e8c6da46b2cbf2a213a2be`, que **no coincide literalmente** con HEAD. `git diff 0c3169377c4e7ccdf0e8c6da46b2cbf2a213a2be..HEAD --stat` devuelve únicamente `docs/pm/tareas/T-001/gate-r1.txt | 199 +`. El commit `be34a04` incorpora la evidencia; código, migraciones y pruebas son idénticos al objeto ejecutado. Se acepta esa evidencia por equivalencia comprobada, sin afirmar igualdad de hashes.
- Archivos adicionales justificados: movimientos de briefs, entrega y gate son gestión de la tarea; `tests/unidad/palmares.test.ts:43` añade únicamente `records: []` al fixture requerido por el nuevo tipo. Firma y comentario de `fechaLogro` son CA-9. Ningún componente o CSS modificado.
- Técnicas aplicadas: particiones de equivalencia, valores límite, tabla de decisión 4×4, revisión de ramas/condiciones, comparación de orden contra un oráculo lexicográfico independiente y error guessing. Niveles: componente, integración DB por evidencia del PM, compilación/regresión por gate. Transiciones de sesión/panel no aplican a este cambio; la transición miembro activo→inactivo queda como ampliación local pendiente.
- Ejecutado por QA: `npx tsc --noEmit --incremental false` → exit 0. `node` con `typescript.transpileModule` y `vm.runInNewContext`, leyendo `lib/records.ts` y ejecutándolo completamente en memoria → 16 combinaciones de cifras coherentes y 3.136 pares ordenados correctamente, con entradas y objetos congelados; cero escrituras o mocks de datos.
- Evidencia PM: `gate-r1.txt:30` typegen; `:36` tsc; `:40` lint; `:48` unidad (7 archivos, 129 pruebas); `:65` build (exit 0); `:136` migraciones locales 0001–0013; `:158` seguridad local (49 pruebas); `:163` comprobaciones SQL y lectura anónima.
- No ejecutado por QA: typegen, lint, Vitest y build, por la restricción de solo lectura; SQL/API local y seguridad, por las restricciones de ejecución del encargo. Sus resultados se atribuyen al gate, no a ejecución propia. El build del gate registra PGRST200: acredita compilación, **no** una lectura funcional exitosa de miembros.

### Evaluación de pruebas y checklist

- Las pruebas unitarias ejercitan resultados observables y fallarían al eliminar el formateo, invertir cada nivel de orden o incluir nacionales superados. No mockean DB; seguridad usa HTTP real (`tests/seguridad/rls.test.ts:32`). D01 documenta una matriz requerida incompleta.
- Seguridad: payload de récord válido `{ titulo: 'intruso' }` (`:54`), filtro `id=gt.0` (`:67`), lectura 200 (`:92`), INSERT/PATCH/DELETE con `42501` específico (`:99`, `:108`, `:123`) y ausencia de intrusos (`:150`). Estas aserciones no confunden un 400 de PostgREST con permisos denegados.
- RLS de 0013 comparado con 0011: activo, tres políticas, escritura solo `authenticated`, `es_admin()` tanto en USING como WITH CHECK, mismos grants. La política SELECT pública añade explícitamente `miembro_id is null`; no usa la peligrosa negación de miembros inactivos. No hay RPC nuevo; `es_admin()` preexistente fija `search_path = public` (`0006_admins_y_escritura.sql:25`). No corresponde exigir un nuevo revoke de función inexistente en este diff.
- No hay secretos nuevos, rutas, redirecciones, hosts, Storage, slugs, formularios, operaciones multietapa de navegador ni APIs nuevas de Next. No introduce fuentes de discrepancia de hidratación. Fechas reutilizan el helper. Migración numerada, claramente de una sola aplicación por CREATE TYPE/TABLE; rollback documentado en `entrega-dev.md:96`.

## Trazabilidad de criterios

CUMPLE identifica evidencia suficiente de código/contrato o ejecución delegada; no convierte las ampliaciones dinámicas pendientes en pruebas ejecutadas.

| CA | Resultado | Evidencia |
| -- | --------- | --------- |
| CA-1 | CUMPLE | `supabase/migrations/0013_records.sql:22` enums, `:28` esquema y `:59` CHECKs. Gate `:136` aplicación real y `:168` rechazos de ambas mitades velocidad/unidad, cero, negativo, espacios, URL, mes sin año y año 1949; alcance NULL confirmado. |
| CA-2 | CUMPLE | `0013_records.sql:122`: NULL explícito OR miembro activo. Gate `:181`: anónimo ve activo y equipo, no inactivo. |
| CA-3 | CUMPLE | `0013_records.sql:136` anon solo SELECT; `tests/seguridad/rls.test.ts:99`, `:108`, `:123` exigen 42501; gate `:158` 49 verdes en local. |
| CA-4 | CUMPLE | Revisión estática: `0013_records.sql:128`, `:131`, `:136` políticas y grants exactos de 0011; `0006_admins_y_escritura.sql:20` función basada en auth.uid. Gate `:192` confirma catálogo de grants/policies. CRUD con JWT admin no consta ejecutado y queda pendiente explícito. |
| CA-5 | CUMPLE | `0013_records.sql:33` FK nullable ON DELETE CASCADE; gate `:185`: 4→3 tras borrar activo, dos del equipo intactos. |
| CA-6 | CUMPLE | `0013_records.sql:107`, `:111`; gate `:190` índices miembro y parcial de equipo. |
| CA-7 | CUMPLE | `lib/types.ts:61`, `:67`, `:74`, `:132`: enums, RecordDeportivo con columnas/nulabilidad y Miembro.records documentado; tsc QA exit 0. |
| CA-8 | CUMPLE | `lib/records.ts:32`, `:39`, `:49`, `:60`; unitarias del gate y exploración QA: 199.999→200 mph, string 9.874, 0.001 s, NaN/Infinity/-0/vacío→null; decisión 4×4. Empates decimales y magnitudes fuera de la columna se documentan como preguntas, no incumplimiento demostrado. |
| CA-9 | CUMPLE | `lib/palmares.ts:47` Pick exacto. Usos conservados: `app/(sitio)/equipo/MiembroCard.tsx:83`, `app/(sitio)/equipo/[slug]/GaleriaTrofeos.tsx:79` y `:138`, `app/(admin)/(panel)/admin/miembros/PalmaresModal.tsx:406`; tsc QA y tests palmares del gate. |
| CA-10 | CUMPLE | `lib/records.ts:69` deriva directamente de marca no nula; 16 combinaciones QA coherentes, incluso tiempo inválido y velocidad sin unidad. |
| CA-11 | CUMPLE | `lib/records.ts:11`, `:76`; `tests/unidad/records.test.ts:128` tres ramas, incluido hito nacional. |
| CA-12 | CUMPLE | `lib/records.ts:87`: copia, vigente, alcance, año, mes, id. Exploración QA de 56 registros válidos (2 vigencias × 4 alcances × 7 fechas) en 3.136 pares, ambos sentidos, entrada congelada. |
| CA-13 | CUMPLE | `lib/records.ts:102`, `:110`; filtros preservan orden; `tests/unidad/records.test.ts:215` y `:228` cubren vacío, superado, pista, hitos y orden. |
| CA-14 | CUMPLE | Revisión estática: `lib/datos.ts:62`, `:94`, `:115` incorporan records(*) y ordenan con fallback []; palmares conserva algoritmo y llamadas. Integración funcional completa pendiente; el build con PGRST200 no la acredita. |

## Defectos

### T-001-D01 — La suite no persiste la tabla de decisión completa requerida para formatearMarca

- **Severidad / Prioridad:** S3 / P3.
- **Área:** testware.
- **Ubicación:** `tests/unidad/records.test.ts:86` (bloque completo hasta `:126`).
- **Pasos / condición:** Comparar sus casos con la matriz exigida en sección 5 del brief: tiempo {válido, nulo, inválido} × velocidad {válida, nula, inválida, sin unidad}. Buscar una velocidad negativa con unidad válida y combinaciones de tiempo inválido con velocidad ausente o inválida.
- **Esperado:** Persistir todas las celdas de la matriz requerida, con resultado esperado explícito, incluidas cifras inválidas independientes de la ausencia de unidad.
- **Obtenido:** Hay seis tests y ocho llamadas; la velocidad inválida de las llamadas es positiva sin unidad o cero también sin unidad. No hay un caso de marca con velocidad negativa y unidad válida. Tampoco cubre toda la matriz de 12 celdas pedida.
- **Evidencia:** `:102` prueba velocidad 142.5 sin unidad; `:121` combina tiempo 0, velocidad 0 y unidad null. `formatearVelocidad` sí prueba negativos aisladamente en `:79`, pero eso no comprueba su composición en marca. QA ejecutó aparte las 16 combinaciones ampliadas y todas pasaron: el hallazgo es cobertura persistida, no fallo funcional demostrado.
- **Sugerencia:** Parametrizar la matriz con expectativas literales e incluir coherencia de tieneCifras; conservar la exploración como regresión reproducible en la suite.
- **Introducido por:** este cambio.

## Riesgos y preguntas (sin evidencia suficiente para defecto)

- **Redondeo decimal:** ejecución del código real devuelve `formatearTiempo(1.0005) = '1.000 s'` y `formatearVelocidad(1.005, 'mph') = '1 mph'` por toFixed (`lib/records.ts:41`, `:56`). El contrato no fija cómo resolver empates ni exige redondeo decimal exacto para valores con más precisión que la columna. Definirlo antes del preview de T-002; no se afirma un CA incumplido con un oráculo ausente.
- **Positivos submínimos:** `formatearVelocidad(0.001,'mph') = '0 mph'`, marca no nula y tieneCifras true. La entrada es positiva y se redondea a dos decimales; no puede persistirse así en numeric(6,2) con CHECK >0. Definir si el preview debe rechazarlo. CA-10 es coherente con la implementación, incluso aquí.
- **Blancos y numeric especiales:** CHECK de título usa btrim sin conjunto de caracteres (`0013_records.sql:59`); gate solo demuestra espacios ASCII. Falta evidencia local sobre tabulaciones/saltos de línea y sobre NaN en numeric para decidir si amplían las particiones inválidas del dominio. No se aprobó su rechazo.
- **CA-4 dinámico y CA-14 integración:** no hay CRUD identificado como authenticated/admin ni salida de las dos funciones de lectura contra datos locales. La conclusión estática favorable no sustituye estas ampliaciones de integración.
- **Deploy:** `entrega-dev.md:96` sí exige **REQUIERE db push ANTES del merge**. Gate `:87` demuestra PGRST200 por relación ausente; `lib/datos.ts:91` y `lib/supabase.ts:50` producen respaldo vacío. Es una dependencia de despliegue conocida y documentada, no autorización para publicar antes de migrar.
- **Identidad de evidencia:** diferencia de HEAD limitada exclusivamente al archivo del gate, comprobada arriba; cualquier cambio adicional en código invalida esta equivalencia.

## Pruebas a ejecutar por el PM

Todas exclusivamente en Supabase/sitio **locales**, sin credenciales ni llamadas remotas. No se ejecutaron en QA por el límite de solo lectura y las restricciones del encargo.

- `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_LOCAL" npm run test:seguridad` — ya verde en el gate; repetir tras cualquier fix. Esperar lectura 200 y escrituras anon 42501, no cualquier error.
- `psql "$DB_URL_LOCAL"` — en transacción con rollback, probar años 1949/1950/2100/2101, meses 0/1/12/13 y mes sin año; título vacío/espacios/tabulaciones/salto de línea; tiempo y velocidad NaN, cero y negativos; fuente `HTTPS://`, `javascript:` y espacio inicial. Registrar SQLSTATE y constraint. El gate cubre parte, no todos estos bordes; para tabulaciones/NaN acordar el resultado de dominio antes de afirmar aprobación.
- `curl --fail-with-body 'http://127.0.0.1:54321/rest/v1/records?select=*' -H "apikey: $ANON_LOCAL" -H "Authorization: Bearer $JWT_ADMIN_LOCAL"` — con admin local y registros de equipo/activo/inactivo, esperar todos; completar POST/PATCH/DELETE con ese JWT y payload válido, y comprobar persistencia. Repetir con JWT local sin pertenencia a admins: ninguna mutación debe persistir (UPDATE/DELETE pueden afectar cero filas por RLS; no exigirles 42501 como si fueran anon).
- `psql "$DB_URL_LOCAL"` más GET anónimo local — alternar activo→inactivo→activo de un miembro de prueba, verificar desaparición/reaparición de sus récords y permanencia de los del equipo. La lectura de estados iniciales ya consta en el gate; la transición no.
- `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_LOCAL" npm run build` — con fixtures locales, verificar ausencia de PGRST200 y consulta embebida de miembros. En ejecución local de getMiembros/getMiembro, comprobar records ordenados, [] sin hijos, miembro inactivo excluido y palmares sin cambios; no mockear DB. El build por sí solo no acredita esas aserciones.
- `npm test` — si se corrige D01, esperar la matriz completa persistida y toda la regresión verde. Incorporar casos de empate decimal solo después de acordar su resultado esperado.
