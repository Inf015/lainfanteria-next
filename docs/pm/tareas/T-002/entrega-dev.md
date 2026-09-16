# Entrega T-002 — ronda 3 (última permitida, fix de `pruebas-pm-r2.txt`)

**Estado:** LISTA PARA QA

Corrige T-002-D06 (N1) y T-002-D07 (N2), los dos hallazgos nuevos del PM en
`pruebas-pm-r2.txt`. D01–D05 quedaron confirmados como corregidos en
interfaz esa misma ronda y **no se tocaron**: corrí sus tests (siguen en
verde) y no cambié su comportamiento — solo se movió el mecanismo interno
que los sostenía (ver «Causa raíz» abajo). `next.config.ts` no se tocó:
`reactStrictMode` sigue activo tal como estaba.

## Causa raíz de D06 — confirmada

Hipótesis del PM (`brief-dev.md` sección 6, ronda 3): `montadoRef` queda en
`false` para siempre tras el doble montaje de React StrictMode.

**Confirmada.** El código de ronda 2 era:

```ts
const montadoRef = useRef(true);
useEffect(() => () => { montadoRef.current = false; }, []);
```

`useEffect(setup, [])` con `setup` vacío (solo devuelve el cleanup) hace que,
bajo StrictMode en desarrollo, React corra: `setup1` (no hace nada) →
`cleanup1` (`montadoRef.current = false`) → `setup2` (tampoco hace nada). El
componente queda realmente montado, pero nada volvió a poner
`montadoRef.current` en `true` después del `cleanup1`: se queda en `false`
para siempre. Con eso, `borradorSigueVigente()` (que dependía de
`montadoRef.current`) era siempre falso después del primer alta o edición
exitosa, así que el `if (borradorSigueVigente(miBorrador)) { setGuardando(false); setForm(null); setEditando(null); }`
final de `guardar()` nunca se ejecutaba: el modal quedaba en «Guardando…»
para siempre aunque el `insert`/`update` ya había confirmado en la base
(coincide exactamente con la evidencia del PM: `POST` en `201`, fila en la
base, botón trabado). Las acciones rápidas «funcionaban» porque su camino de
éxito no pasaba por ese mismo chequeo.

Lo reproduje sin navegador con un test que hace exactamente esa secuencia
(`montar(); desmontar(); montar();`) sobre la sesión nueva y comprueba que,
al contrario que el código viejo, el borrador vigente sigue vigente después
(`tests/unidad/sesion-formulario.test.ts`, ver tabla abajo).

## Defecto → cambio → test

| Defecto | Cambio | Test |
| --- | --- | --- |
| **T-002-D06** (S2/P1, N1) — el alta/edición exitosa deja el modal en «Guardando…» para siempre en `next dev` (StrictMode) | Se reemplazó el par `useRef(true)` + cleanup-solo por una sesión aparte de React: `app/(admin)/(panel)/admin/miembros/sesion-formulario.ts` (nuevo), con `montar()`/`desmontar()` como funciones explícitas. El `useEffect` de `RecordsModal.tsx:85-91` llama `sesion.montar()` en el cuerpo del efecto (no solo en el cleanup), así que la **segunda** pasada de StrictMode también pone `montado = true`; solo un `desmontar()` real, sin `montar()` después, lo deja en `false`. `borradorRef`/`montadoRef` y `borradorSigueVigente()` desaparecieron de `RecordsModal.tsx`; ahora se usa `sesion.esVigente(miBorrador)` (`:148`, `:163`, `:178`, `:187`) y `sesion.estaMontado()` en las acciones rápidas (`:210`, `:214`, `:230`, `:234`). | `tests/unidad/sesion-formulario.test.ts` describe `T-002-D06…` (4 tests): `montar→desmontar→montar` (StrictMode) deja vigente el borrador actual; un desmontaje real después de eso lo deja no vigente; antes del primer `montar()` nada está vigente; un borrador viejo deja de estar vigente cuando se abre uno nuevo (Cancelar/nueva edición — mismo comportamiento que D01-c de ronda 2, ahora sobre el nuevo módulo). |
| **T-002-D07** (S3/P2, N2) — dos envíos en el mismo tick (antes del re-render) insertan dos filas porque la guardia usaba el estado `guardando` | `guardar()` ahora arranca con `if (!sesion.iniciarEnvio()) return;` (`RecordsModal.tsx:127`) — un candado síncrono con una variable cerrada en `sesion-formulario.ts` (no un estado de React, que recién cambia en el siguiente render). El resto de `guardar()` quedó envuelto en `try { … } finally { sesion.terminarEnvio(); }` (`:129`, `:192-194`) para soltar el candado en cualquier salida (validación inválida, error de la base, o éxito), y así un envío legítimo posterior no quede bloqueado. El estado `guardando`/`disabled` del botón no cambió: sigue siendo la señal visual; el candado nuevo es la garantía real. | `tests/unidad/sesion-formulario.test.ts` describe `T-002-D07…` (3 tests): dos `iniciarEnvio()` seguidos — solo el primero toma el candado; tras `terminarEnvio()` un envío nuevo sí puede empezar; `terminarEnvio()` sin un `iniciarEnvio()` previo no rompe el candado siguiente (caso defensivo). |

## Por qué un archivo aparte y no un hook de React

El brief ofrecía la opción de un `.ts` nuevo junto al modal para "el hook o
guard". Elegí una función-fábrica simple (`crearSesionFormulario()`) que
devuelve un objeto con métodos, **sin usar hooks de React adentro**, a
propósito: así se prueba con `vitest` en el entorno `node` de
`tests/unidad/` (el mismo que ya usa `records-form.test.ts`), sin renderizar
componentes, sin `jsdom` ni `@testing-library/react` — que hubiera requerido
agregar dependencias nuevas y tocar `vitest.config.mts`, fuera de los
archivos permitidos esta ronda. `RecordsModal.tsx` conecta esa sesión a su
ciclo de vida con un único `useEffect` (`montar`/`desmontar`) y un
`useState(() => crearSesionFormulario())` para mantener la misma instancia
entre renders — no `useRef` con inicialización perezosa: el lint del repo
(`react-hooks/refs`, de `eslint-config-next` 16) prohíbe leer `ref.current`
durante el render, incluido el patrón `if (!ref.current) ref.current = …`.

## Archivos tocados

- `app/(admin)/(panel)/admin/miembros/sesion-formulario.ts` (nuevo) —
  `crearSesionFormulario()`: `montar`/`desmontar`, `nuevoBorrador`/
  `borradorActual`/`esVigente` (D06/D01-c), `estaMontado` (D02, acciones
  rápidas), `iniciarEnvio`/`terminarEnvio` (D07).
- `app/(admin)/(panel)/admin/miembros/RecordsModal.tsx` — usa la sesión en
  vez de `borradorRef`/`montadoRef`; `guardar()` con el candado síncrono y
  `try/finally`.
- `tests/unidad/sesion-formulario.test.ts` (nuevo) — 7 tests (D06 + D07).

No se tocó `MiembrosAdmin.tsx`: el contrato `onGuardado`/`onBorrado` de
ronda 2 no cambió, ni hacía falta para D06/D07. Tampoco `lib/records-form.ts`,
`lib/records.ts`, `lib/types.ts`, `lib/datos.ts`, `app/(sitio)/` ni
`next.config.ts`.

## Commits de esta ronda

Ver `git log` en la rama — conventional commits en español, archivos
stageados por nombre.

## Verificación (salida real)

```
$ npx next typegen && npx tsc --noEmit
Generating route types...
✓ Types generated successfully
(tsc sin salida = sin errores)

$ npm run lint
> eslint
(sin salida = sin errores)

$ npm test
 Test Files  9 passed (9)
      Tests  194 passed (194)

$ npm run build
✓ Compiled successfully in 562ms
  Running TypeScript ...
  Finished TypeScript in 1375ms ...
[supabase] "miembros activos" falló: { code: 'PGRST200', ... }
✓ Generating static pages using 7 workers (13/13)
```

`npm run build` corrió completo sin que el sistema lo cortara por memoria.
El `PGRST200` es el mismo esperado de rondas anteriores (build contra
Supabase de **producción**, sin la migración 0013 aplicada todavía; no es de
esta tarea).

## Qué verifiqué en local y qué no

**Verificado esta ronda:** los 5 checks de arriba (typegen, tsc, lint,
194/194 tests, build). Los 7 tests nuevos reproducen, sin navegador ni
mocks de base, la secuencia exacta que dispara N1 (StrictMode: montar →
desmontar → montar) y la carrera de N2 (dos envíos antes de que el primero
resuelva). También corrí los 187 tests previos (D01–D05, `validarRecord`,
`aFilaRecord`, `aplicarGuardado`/`aplicarBorrado`/`aplicarRecordsDeMiembro`)
tal cual estaban, sin tocarlos, y siguen en verde.

**No verificado por mí esta ronda:** no levanté `npm run dev` ni toqué el
Supabase local compartido — no hacía falta reabrir sesión ni recrear el
trigger de demora del PM. `brief-dev.md` sección 6 (Ronda 3) pide
explícitamente verificar la hipótesis "sin navegador" con un test del
guard/hook, que es lo que entrego; la repetición en interfaz (alta real en
`next dev`, doble clic humano, Enter repetido) la hace el PM.

## Migraciones

Ninguna.

## Preguntas / bloqueos

Ninguno.
