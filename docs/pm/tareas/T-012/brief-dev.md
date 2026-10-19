# T-012 — Vista previa del auto en el panel

| Campo | Valor |
| ----- | ----- |
| Rama | `oliver132123/autos-vista-previa` |
| Worktree | `/Users/oliverinfante/Code/lainfanteria-next-autos-vista-previa` |
| Base | `origin/main` |
| Tipo | feat |
| Migración | No |
| Ronda | 1 |
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

| ID | Sev | Resumen | Esperado |
| -- | --- | ------- | -------- |

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
