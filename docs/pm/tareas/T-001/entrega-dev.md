# Entrega T-001 — ronda 2

**Estado:** LISTA PARA QA

Ronda de fix sobre `reporte-qa-r1.md` (veredicto PASS-WITH-RESERVATIONS).
Único defecto de esa ronda: **T-001-D01** (S3/P3, testware). El resto del
reporte —riesgos y preguntas sobre redondeo decimal, submínimos, CA-4/CA-14
dinámicos— **no se tocó**: son preguntas para el PM antes de T-002, no
defectos de esta tarea (brief, sección 6).

## Qué hice

| Defecto | Cambio | Test |
| ------- | ------ | ---- |
| **T-001-D01** — `tests/unidad/records.test.ts:86-126` no persistía la tabla de decisión completa de `formatearMarca` (faltaba velocidad negativa con unidad válida y la matriz de 12 celdas) | Reemplacé el bloque de 6 `it` sueltos por un `it.each` sobre un array de 12 filas — tiempo {válido `9.874`, nulo, inválido `0`} × velocidad {válida `142.5 mph`, nula, inválida `-1` con unidad `mph`, sin unidad `142.5`} — cada fila con el `string`/`null` esperado literal y la aserción de `tieneCifras` en la misma fila | `tests/unidad/records.test.ts` › `describe('formatearMarca')`, 12/12 verdes (nombres de test verificados con `--reporter=verbose`, ver abajo) |

No toqué `lib/records.ts`: las 12 combinaciones —incluida la celda nueva,
velocidad `-1` con unidad `mph`— pasan tal cual con la implementación
actual. No hizo falta preguntarle nada al PM.

## Commits (ronda 2)

```
55726a6 test(records): matriz completa de formatearMarca (T-001-D01)
```

(`git log --oneline oliver132123/integracion-records..HEAD`; los commits de
`2bd856b` a `0c31693` son de la ronda 1, ya entregada; `be34a04`, `457e9f2`,
`3ad328e` y `4e5c534` son gate/QA/pruebas-PM/brief que agregó el PM entre
rondas.)

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
   Duration  239ms

$ npx vitest run tests/unidad/records.test.ts --reporter=verbose | grep formatearMarca
 ✓ formatearMarca > tiempo 'válido (9.874)' × velocidad 'válida (142.5 mph)' → '9.874 s @ 142.5 mph'
 ✓ formatearMarca > tiempo 'válido (9.874)' × velocidad 'nula' → '9.874 s'
 ✓ formatearMarca > tiempo 'válido (9.874)' × velocidad 'inválida (-1 con unidad mph)' → '9.874 s'
 ✓ formatearMarca > tiempo 'válido (9.874)' × velocidad 'sin unidad (142.5)' → '9.874 s'
 ✓ formatearMarca > tiempo 'nulo' × velocidad 'válida (142.5 mph)' → '142.5 mph'
 ✓ formatearMarca > tiempo 'nulo' × velocidad 'nula' → null
 ✓ formatearMarca > tiempo 'nulo' × velocidad 'inválida (-1 con unidad mph)' → null
 ✓ formatearMarca > tiempo 'nulo' × velocidad 'sin unidad (142.5)' → null
 ✓ formatearMarca > tiempo 'inválido (0)' × velocidad 'válida (142.5 mph)' → '142.5 mph'
 ✓ formatearMarca > tiempo 'inválido (0)' × velocidad 'nula' → null
 ✓ formatearMarca > tiempo 'inválido (0)' × velocidad 'inválida (-1 con unidad mph)' → null
 ✓ formatearMarca > tiempo 'inválido (0)' × velocidad 'sin unidad (142.5)' → null
```

135 = 129 de la ronda 1 − 6 `it` reemplazados + 12 filas de la matriz nueva.
No corrí `build` ni las suites contra Supabase (`test:seguridad`,
`test:humo`): esta ronda no tocó `lib/`, `datos.ts` ni la migración, y el
brief solo exige `typegen && tsc && lint && test` para el fix.

## Migraciones

Sin cambios respecto a la ronda 1. `supabase/migrations/0013_records.sql`
sigue **REQUIERE db push ANTES del merge** (ver `docs/pm/tareas/T-001/gate-r1.txt`
y el `entrega-dev.md` de ronda 1 en el historial de commits, `0c31693`, para
el detalle y el revert).

## Decisiones tomadas

- **Reemplacé el bloque entero en vez de agregarle filas.** El brief pedía
  "reemplazar/completar"; los 6 `it` viejos quedaban subsumidos por las 12
  celdas de la matriz (mismos casos, más los que faltaban), así que
  mantenerlos aparte hubiera sido cobertura duplicada sin agregar nada. La
  sugerencia de QA ("parametrizar... conservar la exploración como regresión
  reproducible") apunta a lo mismo: una sola tabla, no dos bloques.
- **Usé interpolación `$variable` en el título de `it.each`** (no `%s`
  posicional) para poder nombrar tiempo, velocidad y resultado esperado en el
  mismo título sin depender del orden de las columnas del array — confirmado
  con `--reporter=verbose` que los 12 nombres salen legibles (arriba).
- **No agregué los casos de empate decimal ni `0.001`** que señala QA en
  "Riesgos y preguntas": el brief los excluye explícitamente de esta ronda
  porque el PM todavía no definió el resultado esperado.

## Fuera de alcance que vi (no tocado)

- Ningún hallazgo nuevo. Los riesgos y preguntas de `reporte-qa-r1.md`
  (redondeo decimal, positivos submínimos, blancos/numeric especiales,
  CA-4/CA-14 dinámico) siguen abiertos para que el PM los resuelva antes de
  T-002; no son parte de esta ronda.

## Preguntas / bloqueos

Ninguna. No usé `ask`.
