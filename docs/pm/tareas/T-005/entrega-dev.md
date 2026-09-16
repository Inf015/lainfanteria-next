# Entrega T-005 — ronda 1

**Estado:** LISTA PARA QA

> La implementó el **PM**, no un dev independiente. Se declara acá porque cambia
> cuánto vale esta entrega como evidencia: nadie revisó este código antes que
> QA.

## Qué hice

- Carrusel de pilotos en la portada — `app/(sitio)/_componentes/CarruselEquipo.tsx`
- Estilos, alineados con la tarjeta de `/equipo` — `app/(sitio)/_componentes/carrusel-equipo.module.css`
- Navegación como funciones puras — `lib/carrusel.ts`
- Bloque en la portada entre servicios y novedades, con el filtro por rol
  `Piloto` y la derivación del resumen — `app/(sitio)/page.tsx:120-138`, `:395-417`
- Fondo del bloque — `app/(sitio)/home.module.css:600-607`
- Pruebas — `tests/unidad/carrusel.test.ts`

## Trazabilidad

| CA | Cómo se cumple | Test / evidencia |
| -- | -------------- | ---------------- |
| CA-1 | El bloque va antes del de novedades en el JSX | `app/(sitio)/page.tsx:395`; orden en el HTML servido: `SERVICIOS → EL EQUIPO → LO ÚLTIMO` |
| CA-2 | `.filter((m) => m.roles.includes('Piloto'))` | `app/(sitio)/page.tsx:128`; en el navegador: 8 tarjetas de 11 miembros |
| CA-3 | `recordsNacionalesVigentes` + `textoDistintivoNacional`, los mismos que `MiembroCard` | `page.tsx:137`, `CarruselEquipo.tsx:152-157`; en el HTML: `🏁 4 RÉCORDS NACIONALES` |
| CA-4 | `totalTrofeos(m)` y `{m.trofeos > 0 && …}` | `page.tsx:136`, `CarruselEquipo.tsx:170-175` |
| CA-5 | `setInterval` de 5 s → `paso(1)`; `proximaPosicion` vuelve a 0 en el tope | `tests/unidad/carrusel.test.ts` › "desde el final vuelve al principio"; observado: `0 → 590 → 1180 → … → 4031 → 0` |
| CA-6 | `pausado` desde `onMouseEnter/Leave` y `onFocusCapture/BlurCapture` | `CarruselEquipo.tsx:118-121`; **no verificado en navegador** |
| CA-7 | `matchMedia('(prefers-reduced-motion: reduce)')` corta el intervalo y salta sin animar | `CarruselEquipo.tsx:88-95`, `:66-70`; **no verificado en navegador** |
| CA-8 | `desborda` por `ResizeObserver`; controles y rotación bajo esa condición | `CarruselEquipo.tsx:98-110`, `:190` |
| CA-9 | `proximaPosicion` da la vuelta en ambos extremos | `tests/unidad/carrusel.test.ts` › "desde el principio salta al final" |
| CA-10 | `equipoOn ? getMiembros() : []` y `{equipoOn && equipo.length > 0 && …}` | `page.tsx:117`, `:394` |
| CA-11 | La portada arma `TarjetaEquipo`, no pasa el `Miembro` | `page.tsx:127-138`, `CarruselEquipo.tsx:17-28` |

## Commits

```
fb514f7 feat(home): en la portada solo van los pilotos
c6fb225 fix(home): el carrusel no rotaba — la animación va cuadro a cuadro
4575c48 docs(pm): guía de validación del carrusel y fila T-005 en el tablero
ac6284f feat(home): carrusel del equipo con trofeos y récords entre servicios y novedades
```

## Verificación (salida real, recortada)

```
$ npx tsc --noEmit
(sin salida)

$ npm run lint
(sin salida)

$ npm test
 Test Files  11 passed (11)
      Tests  221 passed (221)

$ npm run build
✓ Compiled successfully

$ npm run test:seguridad
 Tests  49 passed (49)

$ SITIO=http://localhost:3014 npm run test:humo
 Tests  1 failed | 32 passed (33)
 FAIL  cabeceras de seguridad > strict-transport-security presente
 (esperado contra http://localhost: la cabecera solo existe sobre HTTPS)
```

## Migraciones

Ninguna.

## Decisiones tomadas

- **Scroll con `scroll-snap`** en vez de trasladar una pista con `transform`:
  el gesto táctil y la rueda salen gratis. Alternativa descartada: pista con
  `translateX` y ancho calculado en JS, que obliga a coordinar CSS y JS para
  saber cuántas tarjetas entran.
- **Animación propia con `requestAnimationFrame`** en vez de
  `scrollTo({ behavior: 'smooth' })` — ver *Defecto entregado*.
- **Resumen por piloto y no el `Miembro`**: es un componente de cliente y el
  palmarés completo viajaría en el HTML de la portada.
- **Solo pilotos**: pedido de Oliver. Socios y técnicos siguen en `/equipo`.
- **`offsetLeft` como fuente de posiciones** en vez de calcular ancho + gap:
  es exacto y no depende de leer el `gap` computado. Requiere que la pista sea
  el `offsetParent`, por eso el `position: relative` del CSS lleva comentario.

## Defecto entregado (encontrado por Oliver, no por mí)

La ronda 1 pedía el desplazamiento con `scrollTo({ behavior: 'smooth' })`. El
navegador **no arranca esa animación cuando el paso lo dispara un temporizador**
en vez de un clic: el temporizador corría y el destino se calculaba bien, pero
el scroll no se movía. Lo entregué igual, atribuyéndolo por error a una
limitación del navegador de prueba; Oliver lo desmintió en su navegador.
Corregido en `c6fb225` animando cuadro a cuadro.

**Lo que esto le dice a QA:** el testware cubre la aritmética de posiciones,
pero **ninguna prueba falla si se vuelve a `behavior: 'smooth'`**. Es una
debilidad real del testware y conviene que quede reportada.

## Fuera de alcance que vi (no tocado)

- `MiembroCard` y este carrusel repiten el bloque de foto + número + distintivo
  con estilos casi idénticos. Unificarlos es una tarea aparte: la tarjeta de
  `/equipo` además muestra los logros destacados.
- `onScroll` provoca un `setIndice` por cuadro de animación (~27 por paso). La
  mayoría son no-ops para React, pero no está medido.

## Preguntas / bloqueos

Ninguno.
