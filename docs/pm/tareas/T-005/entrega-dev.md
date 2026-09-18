# Entrega T-005 — ronda 2

**Estado:** LISTA PARA QA

> La implementó el **PM**, no un dev independiente. Se declara acá porque cambia
> cuánto vale esta entrega como evidencia.

Corrige los seis defectos de `reporte-qa-r1.md` (FAIL).

## Qué hice

| Defecto | Corrección | Dónde |
| ------- | ---------- | ----- |
| D01 | `punteroAdentro` y `focoAdentro` separados; `pausado` es la unión. `onBlurCapture` mira `relatedTarget`: saltar de un enlace a otro dentro del carrusel no es salir | `CarruselEquipo.tsx:52-58`, `:66`, `:196-205` |
| D02 | `animarScroll` devuelve su cancelador; un efecto corta el paso en curso cuando el carrusel deja de rotar por cualquier motivo, y al desmontar | `lib/carrusel.ts:170-184`, `CarruselEquipo.tsx:78-82`, `:120-127` |
| D03 | `getPilotos()` filtra por rol en la consulta | `lib/datos.ts:101-127`, `page.tsx:112-118` |
| D04 | `paginas()` da las paradas alcanzables; un punto por parada, no por tarjeta; la última parada es el tope y se atribuye a la última tarjeta | `lib/carrusel.ts:22-49`, `CarruselEquipo.tsx:224-241` |
| D05 | Puntos de 44×44 px; el contenedor los baja de línea antes que achicarlos | `carrusel-equipo.module.css:196-213` |
| D06 | Animación extraída a `animarScroll(aplicar, desde, hasta, reloj)` con el reloj inyectado, y probada con un reloj falso | `lib/carrusel.ts:139-184`, `tests/unidad/carrusel.test.ts:125-215` |

`proximaPosicion` e `indiceActivo` ahora trabajan sobre **destinos de paradas**,
no sobre inicios de tarjeta. `proximaPosicion` además recorta el retroceso a
`max`, por el caso que QA marcó como riesgo (scroll pasado del tope durante el
rebote de iOS).

## Trazabilidad de los defectos

| ID | Evidencia de la corrección |
| -- | -------------------------- |
| D01 | Lectura: hover y foco ya no escriben el mismo estado. **No verificado en navegador** (ver abajo) |
| D02 | `carrusel.test.ts` › "cortar deja de mover a mitad de camino" y › "cortar dos veces… no rompe nada" |
| D03 | `lib/datos.ts:113` — `contains('roles', ['Piloto'])`; la portada ya no filtra en memoria |
| D04 | `carrusel.test.ts` › "la última parada es de la última tarjeta"; **en el navegador**: clic en el último punto → `scrollLeft` 4031 = tope, `aria-current` en el punto 7 |
| D05 | `carrusel-equipo.module.css:205-207` |
| D06 | `carrusel.test.ts` › "mueve la posición en cada cuadro y termina en el destino" |

## Commits

```
<pendiente: se completa con el commit de esta ronda>
```

## Verificación (salida real, recortada)

```
$ npx tsc --noEmit        → sin salida
$ npm run lint            → sin salida
$ npm test
 Test Files  11 passed (11)
      Tests  230 passed (230)
$ npm run build
✓ Compiled successfully
```

En el navegador, con el sitio compilado en `localhost:3014`:

```
tarjetas: 8 · max: 4031 · puntos: 8
rotación automática: 0 → 590 → 1180 → 2360 → 2950 → 3540 → 4031 → 0
último punto: scroll 4031 (= max), aria-current en el punto 7
```

## Migraciones

Ninguna.

## Lo que NO pude verificar en el navegador

**D01 y D02 (los dos P1) están corregidos por lectura, no comprobados en uso.**
El navegador que manejo no tiene el foco de la ventana, y sin eso `focus()` no
toma (`document.activeElement` queda en `null`) y el hover no llega a disparar
la pausa. O sea: justamente la pausa por puntero y por teclado es lo que no
puedo ejercitar.

Queda como *Prueba a ejecutar por el PM* — en la práctica, por Oliver, con los
pasos 6 y 7 de `validar.md`.

## Decisiones tomadas

- **Paradas en vez de una por tarjeta** (D04): la alternativa era recortar el
  destino de cada punto a `max`, pero entonces los últimos puntos compartirían
  destino y seguirían sin poder marcarse. Menos puntos que tarjetas es lo que
  hace cualquier carrusel que muestra varias a la vez.
- **Reloj inyectado** (D06) en vez de agregar jsdom + testing-library: probar la
  mecánica de la animación no justifica sumar dos dependencias al proyecto.
  Queda dicho que el cableado del componente no está cubierto.
- **`getPilotos()` reusa `COLUMNAS_MIEMBRO`** (D03): reducir además las columnas
  (biografía, palmarés completo) es otra tarea; el defecto era traer miembros
  que no se muestran.

## Fuera de alcance que vi (no tocado)

- `MiembroCard` y este carrusel repiten el bloque de foto + número + distintivo.
- `onScroll` provoca un `setIndice` por cuadro de animación; la mayoría son
  no-ops para React, pero no está medido.
- La nota de QA sobre el tablero (ronda 2 / PR abierto vs ronda 1) era correcta:
  el tablero mezclaba rondas de implementación con rondas de QA. Corregido.

## Preguntas / bloqueos

Ninguno.
