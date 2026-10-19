# Reporte QA T-012 — ronda 1

**Veredicto:** FAIL  
**Resumen:** El gate corresponde al HEAD y pasa; el recorrido del PM acredita los casos normales. La revisión encuentra dos caminos de acceso a una foto inexistente, aislamiento incompleto del foco y una debilidad en los saltos de las pruebas de navegador.

## Alcance cubierto

- **Diff revisado:** 15 archivos, `38141fb1e8e6bbc78225ef2e20e50438c3833278...cc222baad609c3b6be0eaaa73eda32e7cdaf4e19`.
- **Rama:** `oliver132123/autos-vista-previa`.
- **Técnicas aplicadas:**
  - Particiones y límites: precio vacío, inválido, negativo, cero y exponente; galerías de 0, 1 y varias fotos.
  - Tabla de decisión: visible × estado × fotos × cambios pendientes.
  - Transiciones: edición → vista previa → detalle; cambio de auto sin desmontaje; finalización de subida durante la vista previa.
  - Caja blanca: conservación del estado, condiciones de render, listeners y ramas de `test.skip`.
  - Error guessing: foco detrás del overlay, operaciones asíncronas y comparación con la base.
- **Ejecutado directamente:** `./node_modules/.bin/tsc --noEmit --incremental false` → código 0, sin diagnósticos. Se desactivó la escritura incremental para respetar solo lectura.
- **Ejecución acreditada por el PM:** `gate-r1.txt` registra exactamente el HEAD actual: typegen, tsc y lint correctos; **304 tests, 12 archivos, todos verdes**.
- **Navegador acreditado por el PM:** tres pruebas nuevas pasan contra Supabase local; comparación pública a 1280/375 px y recorrido del panel documentados en `docs/pm/tareas/T-012/pruebas-pm-r1.txt:8`.
- Ese recorrido corresponde a `365ea0e`; `git diff 365ea0e HEAD --stat` confirma que solo se agregó el registro del PM, sin diferencias de código.
- **No ejecutado aquí:** Vitest, build ni Playwright: requieren escrituras; tampoco se accedió a servicios remotos.
- **Archivos adicionales justificados:** `estado.ts` comparte constantes; el spec de navegador está exigido por el brief; los documentos y las dos filas del tablero corresponden a planificación/entrega del PM. Los cuatro archivos expresamente excluidos no aparecen en el diff.
- **Checklist:** no se incorporan tablas, RPC, migraciones, rutas, redirecciones, hosts, secretos ni lógica de fechas/slugs. Se consultaron las guías locales de Next sobre imágenes y CSP. No se modificaron archivos; el único archivo sin seguimiento sigue siendo el gate aportado.

## Trazabilidad de criterios

“CUMPLE” combina inspección estática y, cuando corresponde, evidencia de ejecución del PM; no implica ejecución propia del navegador.

| CA | Resultado | Evidencia |
| -- | --------- | --------- |
| CA-1 | **NO CUMPLE** | JSX, clases, `sizes`, WhatsApp y cleanup conservados; pero cambiar de auto sin desmontar conserva el índice: D01. `app/(sitio)/autos/AutosGrid.tsx:23`, `:68`. |
| CA-2 | CUMPLE | Índice, flechas y bloqueo/restauración del scroll centralizados en `app/(sitio)/autos/DetalleAuto.tsx:30`. |
| CA-3 | CUMPLE | Botón fuera de la condición crear/editar: `app/(admin)/(panel)/admin/autos/AutosAdmin.tsx:476`. |
| CA-4 | CUMPLE | Props actuales en `AutosAdmin.tsx:497`; recorte equivalente de textos en `lib/vista-previa.ts:141` y `AutosAdmin.tsx:122`. Orden con principal primero justificado en la entrega. |
| CA-5 | **NO CUMPLE** | Tarjeta/detalle y ancho móvil acreditados por el PM (`pruebas-pm-r1.txt:36`), pero el detalle falla al recibir la primera foto después de navegar la galería vacía: D02. |
| CA-6 | CUMPLE | Avisos en `lib/vista-previa.ts:155`; precio inválido se representa con raya en `TarjetaAuto.tsx:21`; combinaciones verificadas por tests y PM (`pruebas-pm-r1.txt:32`). |
| CA-7 | CUMPLE | Rama sin `href` en `DetalleAuto.tsx:143`; navegación y pestañas comprobadas por el PM (`pruebas-pm-r1.txt:25`). |
| CA-8 | **NO CUMPLE** | Cierre normal conserva el formulario según PM (`pruebas-pm-r1.txt:27`), pero se pueden activar controles del fondo y reemplazarlo mediante teclado: D03. |
| CA-9 | CUMPLE | Overlay 1050 y detalle 1100; CSP e imágenes verificadas por el PM (`pruebas-pm-r1.txt:38`). |
| CA-10 | **NO CUMPLE** | Nombre, rol y foco inicial/retorno presentes; falta aislamiento del foco y del diálogo superpuesto: D03. |

## Defectos

### T-012-D01 — Cambiar de auto con el detalle montado conserva un índice de otro auto

- **Severidad / Prioridad:** S2 / P1.
- **Área:** ui, regresión pública.
- **Ubicación:** `app/(sitio)/autos/AutosGrid.tsx:23`, `:68`; `app/(sitio)/autos/DetalleAuto.tsx:30`, `:66`.
- **Pasos / condición:**
  1. En `/autos`, abrir mediante teclado un auto A con tres fotos.
  2. Pulsar → dos veces.
  3. El foco permanece en la tarjeta del fondo: el detalle no lo mueve ni vuelve inerte la grilla.
  4. Con Tab/Shift+Tab alcanzar y activar otra tarjeta B, con una foto, sin cerrar A.
- **Esperado:** Como en la base y según CA-1, abrir B reinicia la galería en su primera foto.
- **Obtenido:** `setDetalle(B)` actualiza las props del mismo `DetalleAuto`, sin `key` ni desmontaje. `fotoIdx` permanece en 2 y el render accede a `fotos[2].url`.
- **Evidencia:** La base ejecutaba `setFotoIdx(0)` dentro de `abrir`; el nuevo `abrir` solo ejecuta `setDetalle(a)`. El cambio de longitud del efecto no resetea el estado. Comprobación local de la expresión:
  ```text
  Acceso con indice 2: TypeError: Cannot read properties of undefined (reading 'url')
  ```
  Es evidencia de la operación y del flujo estático; no se ejecutó el recorrido completo en navegador.
- **Sugerencia:** Reiniciar la identidad/estado del detalle al cambiar de auto y proteger el acceso a índices inválidos.
- **Introducido por:** Este cambio. La posibilidad de enfocar el fondo era preexistente; la pérdida del reinicio del índice es nueva.

### T-012-D02 — Una galería vacía queda con índice NaN y falla cuando termina una subida

- **Severidad / Prioridad:** S2 / P1.
- **Área:** ui, integración con storage.
- **Ubicación:** `app/(sitio)/autos/DetalleAuto.tsx:38`, `:66`.
- **Pasos / condición:**
  1. Editar un auto sin fotos e iniciar una subida lenta.
  2. Antes de finalizar, abrir Vista previa y su detalle.
  3. Pulsar ← o →.
  4. Dejar terminar la subida.
- **Esperado:** La primera foto aparece y el panel continúa utilizable.
- **Obtenido:** La tecla calcula módulo cero y deja `fotoIdx = NaN`. Al llegar las fotos, se habilita la rama de imagen y se intenta leer `fotos[NaN].url`.
- **Evidencia:** El botón de vista previa permanece habilitado (`AutosAdmin.tsx:476`). La subida pendiente llama a `onCambio` (`app/(admin)/(panel)/admin/_componentes/SubirFotos.tsx:100`); `actualizarFotos` actualiza `editando` (`AutosAdmin.tsx:190`), que se transmite al detalle sin desmontarlo (`VistaPrevia.tsx:102`). Evaluando en memoria el actualizador extraído del archivo:
  ```text
  ArrowRight con 0 fotos: NaN
  Acceso con indice NaN: TypeError: Cannot read properties of undefined (reading 'url')
  ```
- **Sugerencia:** Ignorar navegación sin fotos y mantener un índice válido al cambiar la galería, antes de acceder al array.
- **Introducido por:** Este cambio expone el cálculo preexistente a fotos que llegan asíncronamente dentro del panel.

### T-012-D03 — La vista previa permite alcanzar y activar controles del fondo

- **Severidad / Prioridad:** S2 / P2.
- **Área:** accesibilidad, estado del formulario.
- **Ubicación:** `app/(admin)/(panel)/admin/autos/AutosAdmin.tsx:288`; `app/(admin)/(panel)/admin/autos/VistaPrevia.tsx:40`, `:57`, `:102`.
- **Pasos / condición:**
  1. Editar un auto y dejar cambios sin guardar.
  2. Abrir Vista previa.
  3. Desde su botón de cierre, recorrer hacia atrás con Shift+Tab hasta un control de la tabla o «Nuevo auto».
  4. Activarlo con Enter.
- **Esperado:** El diálogo modal mantiene la interacción dentro de él y preserva el formulario, conforme a CA-8 y CA-10.
- **Obtenido:** Solo el modal de edición es `inert`; la tabla, «Nuevo auto» y navegación exterior siguen siendo enfocables. Activar «Nuevo auto» ejecuta `setForm(VACIO)` aunque la vista previa siga abierta.
- **Evidencia:** «Nuevo auto» está fuera del contenedor inerte (`AutosAdmin.tsx:208`) y su handler reinicia el formulario (`:84`). `VistaPrevia` enfoca el cierre una vez, pero no contiene Tab ni aísla el resto de la página. `aria-modal` por sí solo no impide la navegación por teclado. Además, abrir el detalle no mueve el foco ni vuelve inerte la vista previa inferior (`VistaPrevia.tsx:102`; `DetalleAuto.tsx:35`).
- **Sugerencia:** Gestionar foco y aislamiento de toda la superficie situada detrás del diálogo activo, incluyendo la transición al detalle y su retorno.
- **Introducido por:** Este cambio, en la nueva vista previa. La ausencia de contención del detalle público era preexistente.

### T-012-D04 — La prueba confunde la ausencia del contador con falta legítima de fotos

- **Severidad / Prioridad:** S3 / P2.
- **Área:** testware.
- **Ubicación:** `tests/navegador/autos.spec.ts:90`, `:97`.
- **Pasos / condición:** Con un auto de varias fotos, eliminar o romper el render del contador y ejecutar las pruebas.
- **Esperado:** Fallar por regresión del contador requerido por CA-1.
- **Obtenido:** `abrirAutoConVariasFotos` interpreta la ausencia del contador como un auto no apto. Si ocurre en todos, salta las dos pruebas con «Ninguno … tiene dos fotos o más». La primera prueba no comprueba el contador.
- **Evidencia:** La única señal para determinar multiplicidad es el propio contador bajo prueba:
  ```ts
  if ((await contador.count()) > 0 && !texto?.endsWith(' / 1')) …
  ```
  Si desaparece, se alcanza `test.skip` sin una aserción fallida. Es un análisis reproducible de la rama; no se modificó el componente para ejecutar la mutación.
- **Sugerencia:** Separar la precondición de datos de la UI cuya integridad se verifica; con fotos conocidas, exigir contador e imagen antes de decidir un salto.
- **Introducido por:** Este cambio.

## Evaluación de los tests del dev

- **Unidad:** verifican recorte, avisos, precio y no mutación con expectativas concretas. No mockean la capa de datos: ejercitan una función pura con objetos de entrada (`tests/unidad/vista-previa.test.ts:1`).
- **Sensibilidad acreditada:** la entrega registra fallos al retirar teclado, ArrowRight y bloqueo del scroll. Las aserciones del spec corresponden a esos comportamientos.
- **Límites:** los tests de la función pura no prueban `guardar()` ni el estado React. La reapertura del spec desmonta primero el detalle (`tests/navegador/autos.spec.ts:166`), por lo que no detecta D01. Tampoco cubren galería vacía → llegada de fotos ni recorrido completo del foco.
- **Saltos:** ausencia de inventario tiene motivo explícito (`autos.spec.ts:62`), pero D04 permite ocultar una regresión.
- **Dependencia de datos:** comparar que dos fotos tengan distinto `src` (`autos.spec.ts:138`) supone URLs diferentes; esa precondición no se valida.

## Riesgos y preguntas

- **Precio vacío:** `guardar()` convierte `''` en 0 (`AutosAdmin.tsx:109`), mientras la función devuelve `null` (`lib/vista-previa.ts:85`). La diferencia existe, pero el input `required` bloquea ese guardado normal (`AutosAdmin.tsx:376`); no hay evidencia de que el flujo ordinario publique un precio distinto. Conviene fijar explícitamente el contrato para invocaciones que omitan validación nativa.
- **Semántica de Escape:** la implementación requiere dos Escape desde el detalle para volver al editor. Está declarada por el dev y acreditada por el PM (`pruebas-pm-r1.txt:27`), pero CA-8 literalmente habla de volver al modal de edición. Conviene incorporar esa decisión al criterio.
- **Sección apagada:** el spec usa ausencia de enlaces en `/` como confirmación, sin verificar la respuesta de esa navegación (`autos.spec.ts:45`). Una portada fallida también podría producir un salto engañoso.
- **Alcance de la evidencia:** las capturas y scripts descartables del PM/dev no están disponibles para repetirlos aquí; se utilizaron sus registros como evidencia atribuida, no como ejecución propia.

## Pruebas a ejecutar por el PM

Todas contra entorno local, sin producción:

- **D01:** recorrer con teclado A de tres fotos → B de una foto sin cerrar el detalle. Debe abrir B en `1 / 1`, sin excepción. Repetir contra la base para confirmar la regresión.
- **D02:** retrasar la subida local, abrir detalle sin fotos, pulsar ambas flechas y completar la subida. Debe mostrar la foto sin error y conservar el formulario.
- **D03:** recorrer Tab/Shift+Tab en ambos diálogos y activar controles alcanzables. El foco debe permanecer en el diálogo superior; al cerrar debe retornar al disparador correspondiente.
- **D04:** en una copia descartable, retirar el contador y ejecutar `npm run test:navegador` con datos locales conocidos. La suite debe fallar, no saltarse por supuesta falta de fotos.
- Tras las correcciones: `npm test` y `npm run test:navegador`, incluyendo los casos anteriores. No se ejecutaron aquí porque requieren escrituras, servidor y fixtures locales.