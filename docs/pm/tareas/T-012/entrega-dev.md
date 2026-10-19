# Entrega T-012 — ronda 1

**Estado:** LISTA PARA QA

## Qué hice

- **Refactor del sitio, sin cambio visual:** `AutosGrid` queda con los filtros y
  el auto abierto; la tarjeta y el detalle pasan a componentes propios.
  - `app/(sitio)/autos/TarjetaAuto.tsx`: la tarjeta de la grilla, el tipo
    `AutoMostrable` (`:12`) y `precioMostrable` (`:21`).
  - `app/(sitio)/autos/DetalleAuto.tsx`: el diálogo con la galería y la info.
    Es **el único lugar** con el índice de foto, el teclado (`Escape`, ← →) y
    el bloqueo del scroll (`:35-50`). Recibe `hrefWhatsapp`; si es `null`, el
    botón se pinta igual pero sin `href` (`:143-155`).
  - `app/(sitio)/autos/estado.ts`: `ESTADO_LABEL` / `ESTADO_CLASE`, que antes
    vivían en `AutosGrid` y ahora usan los dos componentes.
  - `app/(sitio)/autos/AutosGrid.tsx:62` y `:68`: monta `TarjetaAuto` y
    `DetalleAuto`.
- **Función pura** `lib/vista-previa.ts`: `armarVistaPrevia(form, fotos, guardado)`
  (`:129`) → `{ auto, avisos }`; `precioDeFormulario` (`:84`); `TEXTO_AVISO`;
  y el tipo `FormAuto`, que se mudó acá desde `AutosAdmin.tsx` para que lo usen
  los dos lados.
- **Panel:**
  - `app/(admin)/(panel)/admin/autos/VistaPrevia.tsx`: el diálogo de vista
    previa (avisos + tarjeta; al hacer clic en la tarjeta, el detalle).
  - `app/(admin)/(panel)/admin/autos/vista-previa.module.css`: estilos propios,
    módulo nuevo (no toqué `admin.module.css`).
  - `app/(admin)/(panel)/admin/autos/AutosAdmin.tsx`: botón «Vista previa» en el
    pie (`:476-483`), montaje del diálogo (`:497-504`), foco de vuelta al botón
    (`:67-77`), `inert` en el modal de edición mientras la vista previa está
    abierta (`:288`).
- **Pruebas:** `tests/unidad/vista-previa.test.ts` (68 casos) y
  `tests/navegador/autos.spec.ts` (3 pruebas).

## Trazabilidad

| CA | Cómo se cumple | Test / evidencia |
| -- | -------------- | ---------------- |
| CA-1 | Mismo JSX, mismas clases y atributos movidos a `TarjetaAuto`/`DetalleAuto`. El único cambio de expresión es `precioMostrable(auto)` en vez de `formatPrecio(...)`, que da lo mismo cuando el precio es un número (siempre en el sitio). | (a) **HTML idéntico byte a byte**: con un test descartable (no commiteado) rendericé con `renderToStaticMarkup` el `AutosGrid` de `origin/main` y el nuevo, los dos forzados a arrancar con el detalle abierto, en 3 conjuntos de autos (3 fotos / sin fotos / reservado en DOP / vendido / opcionales nulos y vacíos): `expect(nuevo).toBe(viejo)` → 3/3 en verde, con las clases de CSS Module y el `href` de WhatsApp presentes. (b) `tests/navegador/autos.spec.ts` › las 3 pruebas pasan **igual** contra el `AutosGrid` de `origin/main` y contra el nuevo (ver «Prueba de navegador» abajo). |
| CA-2 | Índice de foto, teclado y bloqueo de scroll solo en `DetalleAuto.tsx:31-50`. `AutosGrid` y `VistaPrevia` no tienen nada de eso; el `Escape` de `VistaPrevia` (`:46-54`) solo cierra la vista previa y se apaga mientras el detalle está abierto. | Lectura del diff; `grep -n keydown app/` muestra un solo listener por diálogo. |
| CA-3 | El botón está en el pie del modal, fuera de la condición `editando`: aparece al crear y al editar. | `AutosAdmin.tsx:476-483` |
| CA-4 | `VistaPrevia` recibe `form` (el estado vivo) y `editando?.auto_fotos`; `armarVistaPrevia` recorta como `guardar()` (`trim`, vacío → `null`; marca y modelo → texto recortado). Fotos: en el orden de la galería, con la principal adelante (ver Decisiones). | `vista-previa.test.ts` › «armarVistaPrevia — el auto» › «recorta los textos con espacios…», «los opcionales vacíos… quedan sin dato», «respeta el orden de la galería», «pone la principal primero…» |
| CA-5 | La tarjeta en el diálogo; al hacer clic, el `DetalleAuto` del sitio encima. Ancho máximo 440 px y padding de 16 px a ≤ 480 px. | Harness descartable en Playwright a 360 px y 1280 px: `document.documentElement.scrollWidth` = ancho del viewport (360/360, 1280/1280); capturas revisadas a mano. |
| CA-6 | `armarVistaPrevia` arma la lista; `VistaPrevia` la pinta como `<ul aria-label="Avisos">` con los textos de `TEXTO_AVISO`. Precio inválido → `precio: null` → la tarjeta y el detalle muestran «—» (`precioMostrable`). | `vista-previa.test.ts` › «tabla de decisión de los avisos» (24 combinaciones visible × estado × fotos × sin guardar), «cambios sin guardar» (14 campos + auto nuevo + espacios que no cuentan), `precioDeFormulario` (`''`, `'abc'`, `'-1'`, `'0'`, `'45000'`, `'1e3'` y más), «con precio … no inventa un precio». Harness: avisos `['Cambios sin guardar','No visible en el sitio','Vendido: no aparece en el sitio','Precio inválido']`, tarjeta con «—». |
| CA-7 | Con `hrefWhatsapp={null}` el botón es `<a role="link" aria-disabled="true">` con la misma clase, sin `href` ni `target`. | Harness: `href` = `null`, clic forzado → misma URL y 1 sola pestaña. |
| CA-8 | `Escape` y ✕ de la vista previa llaman a `setVistaPrevia(false)`: no tocan `form`, `editando`, `abierto` ni `router.refresh()`. El diálogo va fuera del `modalFondo`, así que sus clics no llegan al `onClick={cerrar}` del modal. Con el detalle abierto, `Escape` cierra primero el detalle (como en el sitio) y el siguiente, la vista previa. | Harness: `Escape` → se cierra el detalle y la vista previa sigue visible; `Escape` → se cierra la vista previa. `vista-previa.test.ts` › «no muta las entradas». |
| CA-9 | z-index 1050: arriba del modal del panel (200) y del toast (300), abajo del detalle del sitio (1100). Imágenes con `next/image` → `/_next/image` (origen propio, `img-src 'self'`); los estilos en línea de `next/image` entran por `style-src 'unsafe-inline'`, que ya está. No hizo falta tocar `lib/csp.ts` ni `next.config.ts`. | Harness: `elementFromPoint` en el centro con el detalle abierto cae dentro del detalle; consola sin errores de CSP (solo los 404 de las URLs de prueba inventadas). La CSP con nonce del panel no la pude ejercitar (requiere login): queda para la verificación del PM. |
| CA-10 | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` → «Vista previa». Al abrir, foco en «Cerrar vista previa»; al cerrar, vuelve a «Vista previa». El modal de edición queda `inert` mientras tanto, para que el `aria-modal` sea cierto. | Harness: `toBeFocused()` sobre los dos botones, en 360 y 1280 px. |

**Sobre el «harness»:** el panel exige login y no hay fixture (brief §5), así que
para ejercitar `VistaPrevia` en un navegador real la monté **temporalmente** en
`/autos` con datos fijos, y con un spec de Playwright descartable. Nada de eso
está commiteado (`git status` limpio); es evidencia mía, no reemplaza la
verificación manual del PM en el panel.

## Prueba de navegador

En la base de hoy la sección `autos` está **apagada**: `/autos` da 404 y la
portada no la enlaza, así que las 3 pruebas nuevas se **saltan con motivo**:

```
skipped | ['La sección "autos" está apagada hoy (/autos da 404 y la portada no la enlaza)']   ×3
```

Si `/autos` diera 404 con la portada todavía enlazándola, la prueba **falla**
(sección prendida y página rota). Sin autos → se salta por el estado vacío que
pinta el servidor. Ningún auto con 2+ fotos → se saltan las 2 de cambio de foto.

Para demostrar que pueden fallar reemplacé **temporalmente** la consulta de
`app/(sitio)/autos/page.tsx` por 3 autos fijos (0, 1 y 3 fotos), sin commitearlo:

```
# con el código de esta rama
  ✓ abre el detalle, bloquea el scroll del fondo y Escape lo cierra (557ms)
  ✓ → y ← cambian de foto, dan la vuelta, y Escape cierra (675ms)
  ✓ las flechas y los puntos cambian de foto, y al reabrir arranca en la primera (889ms)
  3 passed (7.5s)

# con el AutosGrid de origin/main (antes del refactor)
  3 passed (11.4s)

# sin el handler de teclado (comentado document.addEventListener('keydown', …))
  ✘ abre el detalle, bloquea el scroll del fondo y Escape lo cierra (5.6s)
  ✘ → y ← cambian de foto, dan la vuelta, y Escape cierra (5.6s)
  ✘ las flechas y los puntos cambian de foto, y al reabrir arranca en la primera (5.6s)
    Error: expect(locator).toBeHidden() failed
    Expected: hidden
    Received: visible
    > 123 |     await expect(detalle).toBeHidden();
  3 failed

# solo sin ArrowRight
  ✘ → y ← cambian de foto, dan la vuelta, y Escape cierra (5.7s)
    Error: expect(locator).toHaveText(expected) failed
    Expected: "2 / 3"
    Received: "1 / 3"
    > 137 |     await expect(contador).toHaveText(`2 / ${total}`);
  1 failed
  2 passed (11.3s)

# sin el bloqueo de scroll (document.body.style.overflow = 'hidden' comentado)
  ✘ abre el detalle, bloquea el scroll del fondo y Escape lo cierra (384ms)
    Error: expect(received).toBe(expected) // Object.is equality
    Expected: "hidden"
    Received: ""
    > 116 |     expect(await overflowDelBody(page)).toBe('hidden');
  1 failed
  2 passed (6.2s)
```

**Para el PM:** con la sección apagada, la prueba no ejercita nada en CI ni en el
gate. Cuando haya autos visibles (o prendiendo la sección con al menos un auto de
2+ fotos) conviene correr `npm run test:navegador` una vez.

## Commits

```
103f794 test(navegador): detalle de autos
344b7ef feat(admin): vista previa del auto
bd4a358 refactor(autos): tarjeta y detalle como componentes
a073fac docs(pm): T-011 y T-012 en el tablero
e18a573 docs(pm): brief T-012
```

(Los dos primeros son del PM; más el commit de esta entrega.)

## Verificación (salida real, recortada)

```
$ npx next typegen && npx tsc --noEmit && echo "tsc OK"
tsc OK

$ npm run lint && echo "lint OK"
> eslint
lint OK

$ npm test
 Test Files  12 passed (12)
      Tests  304 passed (304)

$ npm run build
✓ Compiled successfully
✓ Generating static pages using 7 workers (24/24)

$ npx playwright install chromium && npm run test:navegador
  -  /autos — detalle de un auto › → y ← cambian de foto, dan la vuelta, y Escape cierra
  -  /autos — detalle de un auto › las flechas y los puntos cambian de foto, y al reabrir arranca en la primera
  -  /autos — detalle de un auto › abre el detalle, bloquea el scroll del fondo y Escape lo cierra
  ✓  … 15 pruebas del carrusel …
  3 skipped
  15 passed (28.8s)
```

## Migraciones

Ninguna.

## Decisiones tomadas

- **Layout: la tarjeta y, al hacer clic, el detalle, como en el sitio** — porque
  así se reusa el `DetalleAuto` real, con su comportamiento de hoja inferior en
  celular, sin inventar una variante «en línea» que el público nunca ve.
  Descartado: lado a lado, que con un detalle de hasta 880 px no entra junto a
  la tarjeta en escritorio y obligaba a otra variante del detalle (y a decidir
  qué hace su ✕).
- **Con el detalle abierto, `Escape` cierra el detalle y no la vista previa** —
  es lo que pasa en el sitio, y así cada diálogo tiene un solo listener. El
  siguiente `Escape` cierra la vista previa. Nunca llega al modal de edición
  (no tiene `Escape`, y además está `inert`).
- **Fotos: el orden de la galería, con la principal adelante** (`sort` estable
  por `es_principal`, `lib/vista-previa.ts:137`) — hoy `marcarPrincipal` cambia
  la bandera sin mover la foto en el array, así que la galería del panel puede
  tener la principal en el medio, mientras el sitio la pone primera (es la foto
  de la tarjeta). Con T-011 («la primera foto es la principal») el sort no hace
  nada y se ve el orden nuevo tal cual, como pide el brief. Descartado:
  `ordenarFotos` de `lib/formato.ts` (principal + `orden`), porque si T-011
  reordena el array sin reescribir el campo `orden` de cada fila, deshacería
  ese orden.
- **«Cambios sin guardar» compara lo que guardaría `guardar()` con la base**,
  campo por campo y ya recortado — así `' Ford '` o `'45000.0'` no avisan de un
  cambio que en realidad no cambia nada. Las fotos no cuentan: `SubirFotos` las
  guarda en el momento. Un precio inválido siempre cuenta como cambio.
- **Precio `''` es inválido** (el `guardar()` actual haría `Number('') = 0`,
  pero el input es `required` y el navegador no deja enviarlo vacío). Sin precio
  válido la tarjeta y el detalle muestran «—».
- **El recorte vive duplicado** en `guardar()` y en `lib/vista-previa.ts` — no
  toqué `guardar()` para no cambiar el guardado en esta tarea. Los tests fijan
  el comportamiento de la vista previa, no el de `guardar()`.
- **Componentes en `app/(sitio)/autos/`** — al lado de `autos.module.css`, que
  es de donde sacan sus estilos; el panel los importa desde ahí. Descartado
  `components/`, que hoy solo tiene el navbar y el pie, y obligaba a mover el
  CSS del sitio o a importarlo desde lejos.
- **`useEffectEvent`** (React 19.2) para que `DetalleAuto` llame a `alCerrar`
  desde el listener sin volver a registrarlo (ni reaplicar el bloqueo de
  scroll) en cada render del padre. Mismo comportamiento que antes, que
  dependía de `[detalle, fotos.length]`.
- **`inert` en el modal de edición** mientras la vista previa está abierta —
  sin eso, `Tab` salía del diálogo hacia el formulario de atrás y el
  `aria-modal` mentía. Por eso el foco vuelve al botón en un efecto, después del
  render que saca el `inert`.

## Fuera de alcance que vi (no tocado)

- `guardar()` acepta precio vacío como 0 si se saltea la validación del
  navegador (`Number('') === 0`) — `app/(admin)/(panel)/admin/autos/AutosAdmin.tsx:109`.
- El modal de edición del panel no se cierra con `Escape` (no tiene listener) —
  `AutosAdmin.tsx:288`. Preexistente.
- El build avisa que la convención `middleware` está deprecada en Next 16 y
  pide `proxy` — `middleware.ts`.
- La sección `autos` está apagada en la base actual: ninguna prueba de
  navegador de `/autos` ejercita nada hasta que se prenda.

## Preguntas / bloqueos

Ninguno.
