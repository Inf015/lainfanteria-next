# Entrega T-012 — ronda 2

**Estado:** LISTA PARA QA

La ronda 1 quedó en FAIL con D01–D04. En esta ronda corregí **las clases**, como
pide la sección 6 del brief, y no solo cada caso puntual. No toqué nada fuera de
la sección 6. La enmienda de CA-8 (con el detalle abierto, el primer `Escape`
cierra el detalle y el segundo la vista previa) ya era el comportamiento: no
cambia.

## Defecto → fix → test / evidencia

| Defecto | Clase corregida | Fix | Test / evidencia |
| ------- | --------------- | --- | ---------------- |
| **D01** (S2/P1): otro auto con el detalle montado heredaba el índice de foto y `/autos` reventaba | El índice del detalle puede quedar inválido cuando cambian las fotos con el detalle montado | (1) `lib/galeria.ts:12-28`: `indiceValido`, `fotoSiguiente` y `fotoAnterior` devuelven siempre un índice dentro de `[0, n-1]`, o 0 sin fotos; nunca `NaN`. (2) `DetalleAuto.tsx:40`: el índice que se renderiza es `indiceValido(guardado, fotos.length)`, así que nunca se lee `fotos[i]` fuera de rango, cambie como cambie la galería. Las flechas y los puntos parten de ese índice ya ajustado. (3) `AutosGrid.tsx:71`: `key={detalle.id}`, un detalle por auto; el de otro auto arranca en su primera foto, como en `main`. | **Unidad:** `tests/unidad/galeria.test.ts` (16 casos: siguiente y anterior con n = 0, 1 y 3, ajuste al achicarse, `NaN`/±∞/negativos, fotos que llegan a una galería vacía, barrido de entradas para n = 0, 1, 3). **Navegador:** `autos.spec.ts:271` › «D01: activar otra tarjeta con un detalle abierto la abre en su primera foto, sin errores». Mutaciones M1, M1b, M2 y M6, abajo. |
| **D02** (S2/P1): galería vacía + flecha → `NaN`; al llegar las fotos, `fotos[NaN].url` | La misma clase que D01 | La misma: con 0 fotos las flechas devuelven 0, y al llegar fotos el índice se ajusta con `indiceValido` | **Unidad:** `galeria.test.ts` › «sin fotos no hace nada: 0, nunca NaN», «con fotos que llegan a una galería vacía, arranca en la primera», «si la galería se achica…». **Harness de la vista previa** (no commiteado, abajo): flechas sin fotos → llegan 3 → «1 / 3», sin errores; → → «3 / 3»; se achica a 1 → «1 / 1». Con el `DetalleAuto` de la ronda 1, al llegar las fotos: `["Cannot read properties of undefined (reading 'url')"]`. |
| **D03** (S2/P2): con la vista previa abierta se llegaba con Shift+Tab a la tabla y a «+ Nuevo auto»; con el detalle encima, la vista previa seguía activa | El diálogo activo no aísla el resto de la página | (1) `VistaPrevia.tsx:77`: la vista previa va en un portal directo en `<body>`. Mientras está abierta, **todos** los demás hijos de `<body>` quedan `inert` (`:50-65`); se restauran al cerrar y solo se tocan los que no eran inertes ya. (2) `VistaPrevia.tsx:81`: con el detalle encima, la vista previa también queda `inert`. (3) `DetalleAuto.tsx:48-61`: el foco entra al ✕ del detalle al abrir y, al cerrar, vuelve a quien lo tenía (la tarjeta que lo abrió); solo lo devuelve si quedó en el aire, para no quitárselo a otra tarjeta que el usuario activó. (4) Al cerrar la vista previa, el foco vuelve al botón «Vista previa» (`VistaPrevia.tsx:61-64`). Eso reemplaza el `inert` del modal y el efecto de foco que tenía `AutosAdmin` en la ronda 1, que quitamos. | **Navegador en `/autos`** (toqué `DetalleAuto`): `autos.spec.ts:198` › «…el foco entra… Escape cierra y devuelve el foco», `:247` › «…✕ cierra, devuelve el foco…», `:271` › «…al cerrarlo, el foco vuelve a la tarjeta que lo abrió: la de B». **Harness de la vista previa:** con Shift+Tab ×25 el foco nunca sale (`["body","dentro"]`; `body` es la vuelta del ciclo de Tab), los 17 hijos de `<body>` quedan inertes salvo la capa, «+ Nuevo auto» no se alcanza, la vista previa queda inerte con el detalle encima, el foco vuelve a la tarjeta y después al botón, y al final quedan 0 `[inert]`. Mutación M7, abajo. |
| **D04** (S3/P2): el `skip` decidía con el contador, que es la UI bajo prueba | Un `skip` que decide con la misma UI que está bajo prueba | Revisé **todos** los `skip` de `autos.spec.ts`. Ahora la precondición sale de la API REST con la clave pública (`autos.spec.ts:63-101`): `secciones.activa`, y los autos activos no vendidos con sus fotos, con el mismo filtro, orden y orden de fotos que `getAutos()`. Las variables salen del entorno o, si no están, de `.env.local` (`:31`, sin pisar las del entorno, igual que Next). Con eso: sección apagada ⇒ `/autos` **tiene** que dar 404, y se salta; sin autos ⇒ **tiene** que verse el estado vacío, y se salta; con autos ⇒ una tarjeta por auto, en orden y con su título. Si la base dice que un auto tiene n fotos, el detalle **tiene** que mostrar «k / n» y la imagen con **esa** URL (`esperarFoto`, `:176`). Esto también resuelve el riesgo de QA de suponer que las fotos tienen URLs distintas. Ya no hay ningún salto decidido por la UI, y la portada ya no se usa como señal. | Mutación M4 (sin el contador): las 4 pruebas **fallan**, ninguna se salta. En producción hoy: 4 saltadas con «La sección "autos" está apagada en la base (secciones.activa = false)». |

## Cómo demostré las mutaciones

Producción tiene la sección apagada y no tengo Supabase local (requiere sembrar
datos, y el brief no lo autoriza). Para correr la prueba con datos levanté un
**servidor HTTP descartable** en mi scratchpad, fuera del repo, que imita la API
REST de Supabase. Sirve 4 autos: Mustang con 3 fotos, la principal fuera de
orden; Camaro con 1; Wrangler con 0; y Supra con 3. Lo apunté con
`NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54399` en el entorno, que manda sobre
`.env.local` tanto en el build como en la prueba. Para la vista previa del
panel, que exige login, monté `VistaPrevia` un rato en `/autos` con un spec de
Playwright descartable. No commiteé nada de eso: `git status` está limpio. El PM
corre la suite con su Supabase local.

```
# Con el fix (base simulada, 4 autos)
  ✓ abre en la primera foto, el foco entra, bloquea el scroll, y Escape cierra y devuelve el foco
  ✓ → y ← cambian de foto y dan la vuelta, y Escape cierra
  ✓ D01: activar otra tarjeta con un detalle abierto la abre en su primera foto, sin errores
  ✓ las flechas y los puntos cambian de foto; ✕ cierra, devuelve el foco y al reabrir arranca en la primera
  4 passed (8.6s)

# M1 — DetalleAuto y AutosGrid de la ronda 1 (103f794); B = Supra (3 fotos)
  ✓ → y ← cambian de foto y dan la vuelta, y Escape cierra
  ✘ abre en la primera foto, el foco entra, …            Expected: focused  Received: inactive   (:208)
  ✘ D01: activar otra tarjeta …                          La base dice que «Toyota Supra 2020» tiene 3 foto(s)…
                                                         Expected: "1 / 3"  Received: "3 / 3"    (:186)
  ✘ las flechas y los puntos …; ✕ cierra, devuelve el foco … Expected: focused  Received: inactive (:265)
  3 failed, 1 passed

# M1b — ronda 1, base sin el Supra: B = Camaro (1 foto), el caso del PM
  ✘ D01: activar otra tarjeta con un detalle abierto la abre en su primera foto, sin errores
    Error: expect(locator).toBeVisible() failed
    Errores de la página: ["Cannot read properties of undefined (reading 'url')"]
  1 failed
  (con el fix y la misma base: ✓ 1 passed)

# M2 — sin key={detalle.id} en AutosGrid (el índice se ajusta, pero no se reinicia)
  ✘ D01: …   Expected: "1 / 3"  Received: "3 / 3"
  1 failed, 3 passed

# M4 (D04) — sin el contador de la galería
  ✘ ×4   Error: La base dice que «Ford Mustang 2020» tiene 3 foto(s): el detalle tiene que mostrar el contador
         Expected: "1 / 3" | "2 / 3" | "3 / 3"
  4 failed                              (ninguna saltada)

# M5 (D03 en /autos) — DetalleAuto sin mover ni devolver el foco
  ✘ abre en la primera foto, el foco entra, …       Expected: focused  Received: inactive  (:208)
  ✘ las flechas y los puntos …; ✕ cierra, devuelve el foco …  Expected: focused  Received: inactive  (:265)
  2 failed, 2 passed

# M6 (unidad) — lib/galeria.ts con las fórmulas viejas ((i ± 1 + n) % n, sin ajuste)
  × sin fotos no hace nada: 0, nunca NaN                      (fotoSiguiente y fotoAnterior)
  × parte de un índice fuera de rango ya ajustado…            (fotoSiguiente y fotoAnterior)
  × si la galería se achica, se ajusta a la última foto
  × NaN, infinito o negativo vuelven a un índice válido (D02)
  × con fotos que llegan a una galería vacía, arranca en la primera
  × para 0 / 1 / 3 fotos, cualquier entrada da un índice usable
  Tests  10 failed | 6 passed (16)       (restaurado: 16 passed)

# M7 (D03 en la vista previa, harness) — VistaPrevia sin poner `inert` al resto del <body>
  D03 Shift+Tab con la vista previa: ["FUERA:Escríbenos", …tarjetas…, "FUERA:Reservados 1",
    "FUERA:Disponibles 3", "FUERA:Todos 4", "FUERA:+ Nuevo auto"]
  D03 se reseteó el formulario de atrás: true        (con el fix: false, y nunca "FUERA")
```

## Decisiones tomadas

- **En `/autos` el fondo del detalle no queda `inert`** — porque la regresión
  obligatoria de D01 del brief exige llegar con el teclado a otra tarjeta con un
  detalle abierto, y eso es imposible con el fondo inerte. Lo que sí cambió en
  `/autos` es lo que pide D03: el foco entra al detalle y vuelve a la tarjeta.
  Es una mejora de accesibilidad: no agrega atributos ni clases, así que el HTML
  sigue igual. En la vista previa del panel, en cambio, todo lo de atrás queda
  inerte, como pide D03. Si se quiere aislar también el detalle de `/autos`, es
  otra tarea, y la prueba de D01 tendría que cambiar.
- **Índice ajustado al renderizar, no sincronizado con un efecto** — el estado
  guarda el último índice elegido y lo que se muestra es siempre
  `indiceValido(guardado, n)`. Así no hay un render intermedio con un índice
  inválido, que con un efecto sí lo habría.
- **`key` en `AutosGrid` para «otro auto»** — es la forma idiomática de que
  otro auto sea otro detalle, que arranca en la primera foto. La vista previa
  muestra siempre un solo auto: ahí lo que cambia son sus fotos, y eso lo cubre
  el ajuste del índice.
- **Portal + `inert` en los hermanos de `<body>`** en vez de una trampa de
  foco a mano — `inert` corta teclado, mouse y lectores de pantalla de una vez.
  Limitación: un elemento que alguien agregue a `<body>` **después** de abrir la
  vista previa no queda inerte. Hoy el panel no lo hace.
- **Precondiciones por REST con la clave pública** — es la misma fuente y el
  mismo filtro que usa el sitio, con RLS y solo lectura. Riesgo: `/autos` es
  estática (revalidación de 60 s), así que si la base cambia entre el build y la
  prueba, pueden diferir; dentro de una corrida (build + test) no pasa. Si
  faltan las variables, la prueba falla diciéndolo: no se salta.

## Commits

```
7c8c7a8 test(navegador): precondiciones desde la base y regresión de D01
e91c7c8 fix(admin): la vista previa deja inerte todo lo de atrás
335eb88 fix(autos): índice de foto siempre válido y foco en el detalle
dc640b1 docs(pm): brief de fix T-012 r2
9bf64fd docs(pm): QA T-012 r1 — FAIL
cc222ba docs(pm): verificación del PM — T-012 r1
365ea0e docs(pm): entrega de T-012, ronda 1
103f794 test(navegador): detalle de autos
344b7ef feat(admin): vista previa del auto
bd4a358 refactor(autos): tarjeta y detalle como componentes
a073fac docs(pm): T-011 y T-012 en el tablero
e18a573 docs(pm): brief T-012
```

(Sumale el commit de esta entrega.)

## Verificación (salida real, recortada)

```
$ npx next typegen && npx tsc --noEmit && echo "tsc OK"
tsc OK
$ npm run lint && echo "lint OK"
lint OK
$ npm test
 Test Files  13 passed (13)
      Tests  320 passed (320)
$ npm run build
✓ Compiled successfully
✓ Generating static pages using 7 workers (24/24)
$ npm run test:navegador          (contra la base de .env.local: producción)
  -  /autos — detalle de un auto › ×4   La sección "autos" está apagada en la base (secciones.activa = false)
  ✓  … 15 del carrusel …
  4 skipped
  15 passed (29.5s)
```

## Migraciones

Ninguna.

## Fuera de alcance que vi (no tocado)

- En `/autos` el detalle no aísla el fondo (preexistente; ver Decisiones).
- Sigue igual lo de la ronda 1: el contrato de precio vacío de `guardar()`
  (fuera de esta ronda, según el brief) y el aviso de Next 16 de que
  `middleware` está deprecado en favor de `proxy`.

## Preguntas / bloqueos

Ninguno.
