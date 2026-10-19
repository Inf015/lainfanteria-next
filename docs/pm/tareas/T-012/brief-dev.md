# T-012 — Vista previa del auto en el panel

| Campo | Valor |
| ----- | ----- |
| Rama | `oliver132123/autos-vista-previa` |
| Worktree | `/Users/oliverinfante/Code/lainfanteria-next-autos-vista-previa` |
| Base | `origin/main` |
| Tipo | feat |
| Migración | No |
| Ronda | **3 (última)** — `reporte-qa-r2.md` PASS-WITH-RESERVATIONS + defecto confirmado por el PM (D06) |
| Carril | **Normal** (componente con estado + refactor del sitio público) |

**Antes de empezar leé `docs/pm/contexto.md` entero.** Sus reglas ganan sobre
este brief.

## 1. Por qué

Al cargar o editar un auto en `/admin/autos` no hay forma de ver cómo va a
quedar en el sitio sin guardarlo, hacerlo visible y abrir `/autos` en otra
pestaña (y esperar hasta 60 s de revalidación). Oliver quiere un botón
**«Vista previa»** que muestre la tarjeta y el detalle **tal como los ve el
público**, con lo que tiene cargado en el formulario en ese momento.

En paralelo corre **T-011** (reordenar las fotos en `SubirFotos.tsx`). La vista
previa lee las fotos de `editando.auto_fotos`, que ya se actualiza por
`onCambio`. Cuando se mergeen las dos, va a mostrar el orden nuevo sin tocar
nada más.

## 2. Alcance

**Dentro:**
- Extraer de `app/(sitio)/autos/AutosGrid.tsx` la **tarjeta** y el **detalle**
  (galería + info) a componentes reutilizables, **sin cambio visual ni de
  comportamiento** en el sitio.
- Botón «Vista previa» en el modal de `AutosAdmin.tsx` y un overlay que monta
  esos mismos componentes con los datos del formulario.
- Función pura que arma el auto de la vista previa desde el formulario y las
  fotos, con sus tests de unidad.

**Fuera (no tocar aunque parezca relacionado):**
- `app/(admin)/(panel)/admin/_componentes/SubirFotos.tsx` y
  `app/(admin)/admin.module.css`: los toca **T-011** en paralelo. Los estilos
  propios de la vista previa van en un módulo nuevo.
- Productos / merch: la vista previa es solo para autos.
- `lib/datos.ts`, consultas, migraciones, cualquier cosa de la base.
- Cambiar estilos o textos del sitio público.
- Una ruta nueva de vista previa (`/admin/autos/[id]/...`): es un overlay
  dentro del modal, no una página.

## 3. Archivos probables

- `app/(sitio)/autos/AutosGrid.tsx`
- `app/(sitio)/autos/TarjetaAuto.tsx`, `app/(sitio)/autos/DetalleAuto.tsx`
  (nuevos; ubicación y nombres a tu criterio, justificalo)
- `app/(sitio)/autos/autos.module.css` (solo si el refactor lo exige; sin
  cambios visuales)
- `app/(admin)/(panel)/admin/autos/AutosAdmin.tsx`
- `app/(admin)/(panel)/admin/autos/VistaPrevia.tsx` y
  `vista-previa.module.css` (nuevos)
- `lib/vista-previa.ts` (nuevo) + `tests/unidad/vista-previa.test.ts` (nuevo)

## 4. Criterios de aceptación

### Sitio público (refactor)

- **CA-1** — `/autos` se ve y se comporta **igual que antes**: misma tarjeta,
  mismo detalle, filtros, flechas y puntos de la galería, contador, `Escape`
  cierra, ← → cambian de foto, el scroll del fondo se bloquea con el detalle
  abierto, link de WhatsApp con el mismo texto. Ni el HTML ni las clases que se
  renderizan cambian, salvo que lo justifiques en la entrega.
- **CA-2** — La lógica que hoy vive en `AutosGrid` (índice de foto, teclado,
  bloqueo de scroll) queda en un solo lugar: no se duplica entre el sitio y la
  vista previa.

### Panel

- **CA-3** — El modal de autos tiene un botón «Vista previa» en el pie, tanto
  al crear un auto nuevo como al editar uno existente.
- **CA-4** — La vista previa usa los **valores actuales del formulario**,
  aunque no estén guardados (marca, modelo, versión, año, motor, kilometraje,
  precio, moneda, estado, descripción) y las fotos actuales de la galería en
  su orden. Los textos se recortan igual que al guardar (`trim`, vacío → sin
  dato), así la vista previa no muestra algo que el guardado descartaría.
- **CA-5** — Muestra **la tarjeta** (como en la grilla del sitio) y **el
  detalle**. El layout es a tu criterio (lado a lado, o la tarjeta y al hacer
  clic se abre el detalle, como en el sitio); justificalo. Tiene que ser usable
  en un celular (≥ 360 px de ancho, sin scroll horizontal).
- **CA-6** — Avisos visibles arriba de la vista previa, en texto, cuando
  aplican (pueden ser varios):
  - «Cambios sin guardar» si el formulario difiere del auto guardado (o si es
    un auto nuevo todavía no creado);
  - «No visible en el sitio» si `Visible` está destildado;
  - «Vendido: no aparece en el sitio» si el estado es vendido;
  - «Sin fotos» si la galería está vacía;
  - «Precio inválido» si el precio no es un número ≥ 0; en ese caso la vista
    previa **no** muestra un precio inventado (nada de `US$0` ni `NaN`).
- **CA-7** — El botón de WhatsApp se ve igual pero es **inerte**: no navega ni
  abre una pestaña (no tiene que llevar a un chat real desde el panel).
- **CA-8** — `Escape` y el botón ✕ cierran **solo la vista previa** y vuelven al
  modal de edición con el formulario intacto. Ningún valor del formulario
  cambia por abrir o cerrar la vista previa.
- **CA-9** — La vista previa queda por encima del modal del panel (z-index) y
  las imágenes cargan con la CSP del panel (`lib/csp.ts`, `next.config.ts`). Si
  usás `next/image` dentro del panel, verificá que no lo bloquee la CSP con
  nonce; si hace falta tocar `lib/csp.ts`, **escalá** antes.
- **CA-10** — Accesible: el overlay es un `role="dialog"` con `aria-modal` y
  nombre; el foco entra al abrir y vuelve al botón «Vista previa» al cerrar.

## 5. Pruebas requeridas

- [ ] **Unidad** `tests/unidad/vista-previa.test.ts` sobre la función pura de
      `lib/vista-previa.ts` (formulario + fotos → auto de vista previa + avisos):
      textos con espacios → recortados; vacíos → sin dato; precio `''`, `'abc'`,
      `'-1'`, `'0'`, `'45000'`, `'1e3'`; tabla de decisión de los avisos de CA-6
      (visible × estado × fotos × cambios sin guardar); auto nuevo vs.
      existente; la entrada no se muta.
- [ ] **Navegador** (`tests/navegador/`): una prueba de `/autos` que abra el
      detalle de un auto, cambie de foto con → y lo cierre con `Escape`, para
      cubrir CA-1. Depende de que la base tenga autos: si no hay, la prueba se
      **salta con un mensaje explícito**, no pasa en verde vacía. Antes de dar
      por buena la prueba, demostrá que falla si rompés el comportamiento (p.
      ej. quitando el handler de teclado) y pegá la salida en la entrega.
- [ ] Sin pruebas del panel en navegador: exige login y no hay fixture. El PM
      lo verifica a mano.

## 6. Defectos a corregir (solo rondas de fix)

**Ronda 2**, de `reporte-qa-r1.md`. Corregí **las clases**, no solo las
instancias.

**D01 está confirmado por el PM en el navegador:** en `/autos`, abrir el Mustang
(3 fotos), →→, Tab hasta la tarjeta del Camaro (1 foto) y Enter. En `main` abre
el Camaro en «1 / 1»; en esta rama la página revienta con
`Cannot read properties of undefined (reading 'url')`. Es una regresión del
sitio público.

| ID | Sev | Resumen | Esperado |
| -- | --- | ------- | -------- |
| T-012-D01 + D02 | S2/P1 | **Clase: el índice de foto del detalle puede quedar inválido cuando cambian las fotos con el detalle montado.** Instancias: otro auto (D01), galería vacía + flecha → `NaN` y después llegan fotos (D02). Hay más de la misma forma: con T-011 se pueden **borrar** fotos, y una galería que se achica deja el índice fuera de rango | El índice es **siempre válido** para la galería que se está mostrando, cambie como cambie: otro auto arranca en la primera foto (como en `main`); con 0 fotos las flechas no hacen nada; si la galería se achica, el índice se ajusta; jamás se lee `fotos[i]` con `i` fuera de rango. La lógica del índice va en una función pura con tests de unidad (siguiente/anterior con n = 0, 1, 3; ajuste al achicarse). |
| T-012-D03 | S2/P2 | **Clase: el diálogo activo no aísla el resto de la página.** Con la vista previa abierta se llega con Shift+Tab a la tabla y a «+ Nuevo auto», que resetea el formulario. Con el detalle abierto encima de la vista previa, la vista previa sigue activa | Mientras la vista previa está abierta, **todo** lo que está detrás (no solo el modal de edición) es inerte. Con el detalle abierto encima, la vista previa también lo es, el foco entra al detalle y al cerrarlo vuelve a la tarjeta que lo abrió. Si para eso hace falta tocar `DetalleAuto`, el cambio también vale para `/autos`: está permitido (es una mejora de accesibilidad, no visual), pero se documenta en la entrega y se cubre con una prueba de navegador en `/autos`. |
| T-012-D04 | S3/P2 | **Clase: un `skip` que decide con la misma UI que está bajo prueba.** Si desaparece el contador, la prueba se salta en vez de fallar | Revisá **todos** los `test.skip` de `autos.spec.ts`. La precondición de datos (hay autos, hay uno con 2+ fotos, la sección está apagada) se decide con una fuente **independiente de la UI**, por ejemplo la API REST con la clave pública (`NEXT_PUBLIC_SUPABASE_URL`/`_ANON_KEY` ya están en el entorno de la prueba), y verificando el código de respuesta de cada navegación. Si los datos dicen que hay un auto con 2+ fotos, la UI **tiene** que mostrar el contador y la imagen, o la prueba falla. Demostrá que falla si quitás el contador (mutación temporal, sin commitear) y pegá la salida. |

**Ronda 3.** QA r2 dio PASS-WITH-RESERVATIONS (D01–D04 FIXED). La reserva de
testware D05 la cerró el PM repitiendo las mutaciones contra Supabase local real
(`pruebas-pm-r2.txt`). QA dejó un riesgo que el PM **confirmó en el navegador**:

```
Editar Mustang → cambiar precio → «Guardar cambios» (PATCH demorado 2 s)
→ dentro de la latencia: «Vista previa» (está habilitado) → se abre
→ termina el guardado: el modal se cierra, la vista previa también (se desmonta)
→ Editar Camaro → la vista previa REAPARECE SOLA
```

| ID | Sev | Resumen | Esperado |
| -- | --- | ------- | -------- |
| T-012-D06 | S3/P2 | **Clase: estado de la vista previa que sobrevive al editor que la abrió.** `vistaPrevia` no se resetea cuando el editor se cierra o cambia de registro (cerrar, guardar con éxito, «+ Nuevo auto», «Editar» otro), así que la próxima edición abre con la vista previa ya puesta | **Todo** camino que cierra el editor o cambia de registro deja la vista previa cerrada, y el foco no queda apuntando a un botón desmontado. Revisá cada uno: `cerrar()`, el éxito de `guardar()`, `abrirNuevo()`, `abrirEdicion()`. Además, mientras `guardando` es `true`, «Vista previa» queda deshabilitado (no tiene sentido previsualizar algo que se está guardando y es la puerta de entrada de la carrera). |

Pruebas: si extraés la transición a una función pura, cubrila en unidad. Si no,
dejá en la entrega la secuencia exacta para el PM (la de arriba más «+ Nuevo
auto» y «Editar» otro con la vista previa abierta). No hagas mutaciones contra
un servidor que imite Supabase: el PM las corre contra Supabase local.

---

Pruebas de regresión obligatorias (navegador, `/autos`):
- D01: A (2+ fotos) → flechas → Tab a otra tarjeta B → Enter → B en «1 / n», sin
  `pageerror`. Demostrá que falla sin el fix.
- D03 en `/autos`, si tocaste `DetalleAuto`: el foco entra al detalle y vuelve
  a la tarjeta al cerrar.

Para correrlas con datos, la sección autos tiene que estar prendida: en
producción está apagada. El PM las corre contra Supabase local sembrado. Vos
dejá la prueba correcta y demostrá las mutaciones como en la ronda 1.

**Enmienda de CA-8 (decisión del PM, la valida Oliver en el PR):** con el
detalle abierto encima de la vista previa, `Escape` cierra primero el detalle y
el siguiente `Escape` cierra la vista previa. Es el comportamiento del sitio y
el que ya implementaste; no cambia.

Fuera de esta ronda: el contrato de precio vacío de `guardar()` (riesgo de QA,
no defecto: el `required` lo cubre).

## 7. Definición de hecho

- [ ] Todos los CA cumplidos, cada uno con su test o evidencia
- [ ] `npx next typegen && npx tsc --noEmit` limpio
- [ ] `npm run lint` limpio
- [ ] `npm test` verde
- [ ] `npm run build` pasa
- [ ] `npm run test:navegador` verde (o la prueba nueva saltada con motivo, y
      las existentes verdes)
- [ ] Commits convencionales, archivos stageados por nombre, en la rama
      correcta. Corte sugerido: `refactor(autos): tarjeta y detalle como
      componentes` · `feat(admin): vista previa del auto` ·
      `test(navegador): detalle de autos`
- [ ] Working tree limpio (`git status --short` vacío)
- [ ] `entrega-dev.md` commiteada
- [ ] Sin push, sin PR

## 8. Nota para el PM (no para el dev)

Verificación manual antes de QA y antes del PR, con `npm run build && npm start`
y login de admin:
- `/autos` antes y después del refactor: capturas de la grilla y del detalle,
  a 1280 px y a 375 px.
- Panel: auto nuevo sin guardar, auto existente con cambios, auto oculto,
  vendido, sin fotos, precio inválido; `Escape` cierra solo la vista previa;
  WhatsApp inerte; consola sin errores de CSP.
