# Reporte QA T-012 — ronda 2

**Veredicto:** PASS-WITH-RESERVATIONS

**Resumen:** D01–D04 están corregidos según revisión estática, gate y comprobaciones del PM con Supabase local. No encontré un CA funcional incumplido. Queda una reserva de testware: las mutaciones del dev utilizaron una simulación de Supabase, contraria a la convención del proyecto.

## Alcance cubierto

- **Diff revisado:** 20 archivos; `38141fb1e8e6bbc78225ef2e20e50438c3833278...d89b2285b8c80c8c8764e32d70277ea993dc1747`. Rama correcta: `oliver132123/autos-vista-previa`.
- **Técnicas aplicadas:** particiones de precio válido/inválido y galería vacía/no vacía; límites de índices y cantidades 0/1/3; tabla de decisión de avisos; transiciones editor → vista previa → detalle → retorno; revisión de ramas, cleanup y sensibilidad de tests; error guessing sobre foco, fotos asíncronas y guardado concurrente.
- **Ejecución propia:** `./node_modules/.bin/tsc --noEmit --incremental false` → código **0**, sin diagnósticos. Se desactivó incremental para evitar escribir caché.
- **Gate del PM:** HEAD exacto coincidente; typegen, tsc y lint OK; **13 archivos y 320 tests aprobados** (`docs/pm/tareas/T-012/gate-r2.txt:4`, `:46`, `:74`).
- **Navegador, evidencia del PM:** cuatro pruebas de autos aprobadas con Supabase local; 15 pruebas del carrusel saltadas. Recorrido adicional del panel y regresión visual aprobados (`docs/pm/tareas/T-012/pruebas-pm-r2.txt:5`, `:18`, `:34`).
- El recorrido del PM corresponde a `1efc78b`; `git diff 1efc78b..HEAD` agrega únicamente `pruebas-pm-r2.txt`: el código probado coincide con el actual.
- **No ejecutado aquí:** Vitest, build, Playwright ni mutaciones, por requerir escrituras y/o servicios. No se accedió a producción ni se leyeron secretos.
- **Archivos adicionales justificados:** `estado.ts` centraliza etiquetas/clases; `lib/galeria.ts` y su test responden al fix exigido; el spec de navegador es obligatorio; documentos y tablero registran planificación/evidencia. Los cuatro archivos expresamente excluidos **no aparecen en el diff**.
- **Estado del árbol:** únicamente `gate-r2.txt` sin seguimiento, ya presente al comenzar. No se modificaron archivos.

## Trazabilidad de criterios

“CUMPLE” combina inspección estática con evidencia atribuida al PM; no implica ejecución propia del navegador.

| CA | Resultado | Evidencia |
| -- | --------- | --------- |
| CA-1 | CUMPLE | Comparación con la base: filtros, clases, atributos, `sizes`, texto y enlace de WhatsApp conservados. Reinicio por identidad en `app/(sitio)/autos/AutosGrid.tsx:71`; teclado y restauración del scroll en `app/(sitio)/autos/DetalleAuto.tsx:64`. Comparación pública y regresión del PM: `docs/pm/tareas/T-012/pruebas-pm-r2.txt:13`, `:34`. |
| CA-2 | CUMPLE | Estado, navegación, teclado y scroll centralizados en `app/(sitio)/autos/DetalleAuto.tsx:37`; funciones de índice en `lib/galeria.ts:12`. |
| CA-3 | CUMPLE | Botón común a creación/edición, `type="button"`: `app/(admin)/(panel)/admin/autos/AutosAdmin.tsx:464`. |
| CA-4 | CUMPLE | Props actuales y fotos de edición en `app/(admin)/(panel)/admin/autos/AutosAdmin.tsx:484`; normalización en `lib/vista-previa.ts:141`, equivalente a `guardar()` en `AutosAdmin.tsx:110`. Principal primero documentada en `lib/vista-previa.ts:121`. |
| CA-5 | CUMPLE | Componentes compartidos en `app/(admin)/(panel)/admin/autos/VistaPrevia.tsx:121`, `:127`; acceso protegido a fotos en `app/(sitio)/autos/DetalleAuto.tsx:40`, `:91`. Móvil a 360 px: `docs/pm/tareas/T-012/pruebas-pm-r1.txt:36`, ratificado en `pruebas-pm-r2.txt:35`. |
| CA-6 | CUMPLE | Avisos y precio inválido en `lib/vista-previa.ts:84`, `:155`; precio nulo mostrado como raya en `app/(sitio)/autos/TarjetaAuto.tsx:21`. PM: `docs/pm/tareas/T-012/pruebas-pm-r1.txt:30`, ratificado en ronda 2. |
| CA-7 | CUMPLE | Preview pasa `hrefWhatsapp={null}`; rama sin `href` en `app/(sitio)/autos/DetalleAuto.tsx:177`. Navegación/pestañas verificadas por PM en `docs/pm/tareas/T-012/pruebas-pm-r1.txt:24`. |
| CA-8 | CUMPLE | Cierre de preview solo modifica su booleano en `app/(admin)/(panel)/admin/autos/AutosAdmin.tsx:487`; Escape condicionado al detalle en `VistaPrevia.tsx:68`. Formulario intacto: `docs/pm/tareas/T-012/pruebas-pm-r2.txt:26`. Se aplica la enmienda de Escape en dos pasos. |
| CA-9 | CUMPLE | Overlay con z-index 1050 en `app/(admin)/(panel)/admin/autos/vista-previa.module.css:9`. Imágenes/CSP comprobadas por PM: `docs/pm/tareas/T-012/pruebas-pm-r1.txt:38`, ratificadas en ronda 2. |
| CA-10 | CUMPLE | Portal, aislamiento y retorno de foco en `app/(admin)/(panel)/admin/autos/VistaPrevia.tsx:50`; rol/nombre en `:82`; foco del detalle en `app/(sitio)/autos/DetalleAuto.tsx:48`. Recorrido del PM: `docs/pm/tareas/T-012/pruebas-pm-r2.txt:19`. |

CA-2/3/4/6 admiten verificación principalmente estática y unitaria. CA-1/5/7/8/9/10 necesitan además navegador; se utilizó la evidencia del PM indicada.

## Confirmación de defectos anteriores

| ID | Estado | Evidencia |
| -- | ------ | --------- |
| T-012-D01 | FIXED | `AutosGrid.tsx:71` cambia la identidad del detalle por auto; `DetalleAuto.tsx:40` ajusta el índice antes de leer la foto. PM reproduce Mustang → Camaro sin errores y con `1 / 1`: `pruebas-pm-r2.txt:13`. |
| T-012-D02 | FIXED | `lib/galeria.ts:19`, `:25` evitan módulo cero; `DetalleAuto.tsx:40` protege también reducción y llegada de fotos. Tests de ajuste en `tests/unidad/galeria.test.ts:63`; llegada real comprobada por PM en `pruebas-pm-r2.txt:27`. |
| T-012-D03 | FIXED | Preview aislada mediante portal y hermanos inertes; preview inferior inerte cuando abre el detalle (`VistaPrevia.tsx:50`, `:81`). PM confirma recorrido, retorno y limpieza (`pruebas-pm-r2.txt:19`). La excepción del fondo público está expresamente aceptada por el PM en `:38`. |
| T-012-D04 | FIXED | Todos los saltos dependen del inventario REST: `tests/navegador/autos.spec.ts:121`, `:135`, `:154`, `:279`. Estado HTTP comprobado antes del salto; contador exigido en `:183`. Reserva sobre la ejecución de mutaciones: D05. |

## Evaluación de los tests del dev

- **Unidad:** ejercitan funciones puras, sin mockear persistencia. Cubren normalización, precio, no mutación y las 24 combinaciones de avisos; galería cubre índices inválidos, extremos y navegación circular (`tests/unidad/vista-previa.test.ts:61`, `:234`; `tests/unidad/galeria.test.ts:10`).
- **Sensibilidad:** quitar la protección de módulo cero contradice directamente las expectativas unitarias. Retirar teclado o contador contradice las aserciones del spec (`tests/navegador/autos.spec.ts:183`, `:235`). La entrega registra fallos de las mutaciones, con la limitación de D05.
- **D01:** el test prefiere otro auto con varias fotos, lo que permite detectar pérdida del reinicio aunque ya exista ajuste de rango (`tests/navegador/autos.spec.ts:280`). Si B tiene una sola foto, quitar únicamente la `key` puede pasar porque el ajuste produce cero: la sensibilidad depende del inventario.
- **Cobertura restante:** no hay test persistente del componente para fotos que llegan o se eliminan, ni para aislamiento del panel; hay funciones unitarias y recorridos externos del PM/dev. Retirar solo `indiceValido` del render puede dejar verdes las pruebas unitarias de esa función (`DetalleAuto.tsx:40`; `tests/unidad/galeria.test.ts:58`).
- **Checklist:** el diff no incorpora tablas, RPC, migraciones, rutas, redirecciones, secretos, hosts ni operaciones de storage. No corresponde acreditar nuevamente RLS o borrado de buckets con este cambio. La extracción conserva `next/image`; se consultó su guía local de Next 16.

## Defectos

### T-012-D05 — Las mutaciones de navegador se acreditaron con una simulación de Supabase

- **Severidad / Prioridad:** S3 / P3.
- **Área:** testware / evidencia.
- **Ubicación:** `docs/pm/tareas/T-012/entrega-dev.md:22`.
- **Pasos / condición:** revisar el entorno declarado para demostrar las mutaciones M1/M1b/M2/M4/M5.
- **Esperado:** respetar la prohibición de mockear la capa de datos de `docs/pm/contexto.md`, usando Supabase local real.
- **Obtenido:** el dev sustituyó la API de Supabase por un servidor que devuelve inventario simulado.
- **Evidencia:** la entrega declara un servidor «que imita la API REST de Supabase» y apunta allí el build y los tests (`entrega-dev.md:24`).
- **Sugerencia:** repetir las mutaciones relevantes contra Supabase local sembrado y conservar la salida reproducible.
- **Introducido por:** fix de la ronda anterior, en su procedimiento de validación.

La prioridad P3 se apoya en evidencia compensatoria concreta: el PM ya ejecutó el código corregido contra Supabase local real y confirmó D01–D03. La reserva afecta la demostración de sensibilidad y el cumplimiento del método, sin demostrar un fallo funcional nuevo (`pruebas-pm-r2.txt:3`, `:13`, `:18`).

## Riesgos y preguntas

- **Guardado pendiente:** el botón de preview permanece habilitado mientras `guardar()` espera la respuesta. Un guardado exitoso puede cerrar el editor y desmontar la preview; `vistaPrevia` no se reinicia en `cerrar()` ni al abrir otro editor. Conviene comprobar si reaparece automáticamente en la siguiente edición. No se ejecutó esa carrera y no se considera defecto confirmado (`AutosAdmin.tsx:65`, `:72`, `:86`, `:126`, `:464`).
- **Hijos nuevos de `<body>`:** el aislamiento captura solo los existentes al montar. Un portal añadido después quedaría fuera; no hay un flujo demostrado que lo produzca en este panel (`VistaPrevia.tsx:53`; limitación declarada en la entrega).
- **Datos cambiantes:** REST consulta inventario actual, mientras `/autos` puede mostrar datos del build/revalidación. Un cambio concurrente puede producir falsos fallos; usar inventario local estable (`autos.spec.ts:112`; `docs/pm/contexto.md`, invariante de revalidación).
- **Precio vacío:** continúa la diferencia explícita respecto a `Number('')`, cubierta por `required` en el flujo normal y excluida de esta ronda por el brief (`lib/vista-previa.ts:79`).
- Los scripts y capturas descartables no están disponibles para repetición desde este repositorio. Su resultado se acepta como evidencia atribuida, no como ejecución propia.

## Pruebas a ejecutar por el PM

Solo en entorno local:

- `npm run test:navegador -- tests/navegador/autos.spec.ts` — repetir las mutaciones sin contador y sin `key` en una copia descartable, con **dos autos de varias fotos**. Deben fallar por contador ausente e índice inicial incorrecto, respectivamente; cerrar D05 con evidencia de Supabase real.
- Recorrido del panel con galería **3 → 1 → 0 → 3**, incluyendo flechas con cero fotos: nunca debe aparecer excepción ni contador fuera de rango. Complementa la confirmación estática de reducción de galería.
- Guardado local con respuesta demorada → abrir preview → completar guardado → editar otro auto: comprobar cierre, formulario y ausencia de reapertura automática.
- No se repitieron aquí porque requieren escrituras, servidor o manipulación temporal del código. Las comprobaciones ya acreditadas por el gate y el PM no necesitan repetirse salvo cambio posterior.