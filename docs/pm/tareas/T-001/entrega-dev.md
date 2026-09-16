# Entrega T-001 — ronda 3

**Estado:** LISTA PARA QA

Última ronda de fix permitida. Hallazgos del PM en `pruebas-pm-r2.txt`
(exploración SQL de bordes, sección "Ronda 3" del brief): **T-001-D02** y
**T-001-D03**, los dos S3/P2. La 0013 sigue sin aplicarse en ningún entorno
remoto, así que el fix va en el mismo archivo, sin migración `0014`.

## Qué hice

Los dos defectos son CHECKs de `supabase/migrations/0013_records.sql` que
aceptaban un dato que no debían. Sin tests nuevos: son invariantes de base
que no se pueden ejercitar desde `tests/unidad` ni con `anon` en
`tests/seguridad` — el brief pide explícitamente no agregarlos; el PM los
corre contra Supabase local con los casos de `pruebas-pm-r2.txt`.

### T-001-D02 — título de solo blancos no imprimibles

`records_titulo_no_vacio` usaba `btrim(titulo)`, que solo recorta espacios
comunes: un título de puro tab, salto de línea, CR o espacio duro (U+00A0)
pasaba el CHECK y quedaba como una ficha vacía en la página.

```diff
- constraint records_titulo_no_vacio     check (btrim(titulo) <> ''),
+ constraint records_titulo_no_vacio     check (titulo ~ '[^[:space:]]'),
```

Mismo nombre de constraint. `[:space:]` en esta base cubre tab, salto de
línea, CR y U+00A0 (verificado por el PM en `pruebas-pm-r2.txt:17-18`); el
CHECK exige al menos un carácter fuera de esa clase.

### T-001-D03 — `tiempo_s` / `velocidad` aceptaban `'NaN'`

En Postgres, `numeric` admite el valor especial `NaN`, y `NaN` se define
mayor que cualquier número — así que `tiempo_s > 0` (y `velocidad > 0`) lo
dejaban pasar en vez de rechazarlo.

```diff
- constraint records_tiempo_positivo     check (tiempo_s is null or tiempo_s > 0),
- constraint records_velocidad_positiva  check (velocidad is null or velocidad > 0),
+ constraint records_tiempo_positivo
+     check (tiempo_s is null or (tiempo_s > 0 and tiempo_s <> 'NaN')),
+ constraint records_velocidad_positiva
+     check (velocidad is null or (velocidad > 0 and velocidad <> 'NaN')),
```

Mismos nombres de constraint. `Infinity` no hacía falta tocarlo: ya lo
rechaza la precisión de la columna (`numeric(8,3)` / `numeric(6,2)`) con
`22003: numeric field overflow`, visto en `pruebas-pm-r2.txt:24` para
`tiempo 100000`.

No toqué `lib/`, tests ni ningún otro archivo. No usé `ask`: los dos
defectos traían el CHECK exacto en el brief.

## Commits (ronda 3)

```
bf2b20d fix(db): CHECKs de records rechazan título en blanco y NaN (T-001-D02, D03)
```

(`git log --oneline oliver132123/integracion-records..HEAD`; todo lo
anterior a `bf2b20d` es de rondas 1-2, ya entregado, o gate/QA/pruebas-PM que
agregó el PM entre rondas.)

## Verificación (salida real, recortada)

```
$ npx next typegen && npx tsc --noEmit
✓ Types generated successfully
(sin errores)

$ npm run lint
> eslint
(sin salida = sin errores)

$ npm test
 Test Files  7 passed (7)
      Tests  135 passed (135)
   Duration  202ms
```

135/135, sin cambios respecto a la ronda 2: este fix es solo SQL, no toca
nada que las suites de TypeScript ejerciten. No corrí la migración ni ningún
SQL — la prueba el PM contra Supabase local con los casos de
`pruebas-pm-r2.txt` (título tab/salto de línea, `tiempo_s`/`velocidad` NaN).

## Migraciones

`supabase/migrations/0013_records.sql` — **sigue REQUIRE db push ANTES del
merge** (sin cambios en esa condición desde la ronda 1). Se **editó el mismo
archivo** en vez de sumar una `0014`, porque la 0013 todavía no se aplicó en
ningún entorno remoto (confirmado en el brief de esta ronda).

**Revertir** (sin cambios respecto a rondas anteriores):
```sql
drop table if exists records;
drop type if exists alcance_record;
drop type if exists unidad_velocidad;
```

## Decisiones tomadas

- **Edité el archivo 0013 en vez de crear 0014**, como indica el brief:
  todavía no hay ningún entorno remoto con la 0013 aplicada, así que no hay
  nada que una migración nueva tenga que corregir sobre datos ya cargados.
- **No agregué tests.** Ambos son invariantes de `CHECK` de Postgres
  (clase de caracteres `[:space:]`, comparación con `NaN`) sin manera de
  ejercitarlos desde `tests/unidad` (no hay conexión a Postgres real ahí) ni
  desde `tests/seguridad` (que solo prueba permisos con `anon`, no
  invariantes de dominio). El brief lo pide así explícitamente.
- **No toqué el CHECK de `fuente_url` ni ningún otro**: `pruebas-pm-r2.txt`
  confirma que los demás (año, mes, mes-sin-año, velocidad-con-unidad, URL)
  siguen rechazando lo que tienen que rechazar.

## Fuera de alcance que vi (no tocado)

- Ningún hallazgo nuevo. Los riesgos y preguntas de `reporte-qa-r1.md`
  (redondeo decimal, positivos submínimos) y lo no probado de
  `pruebas-pm-r2.txt` (getMiembros/getMiembro con fixtures reales) siguen
  abiertos para el PM antes de T-002; no son parte de esta ronda.

## Preguntas / bloqueos

Ninguna. No usé `ask`.
