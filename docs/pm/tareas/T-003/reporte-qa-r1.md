# Reporte QA T-003 — ronda 1

**Veredicto:** FAIL
**Resumen:** Se confirmó un incumplimiento de CA-1: la velocidad secundaria no queda necesariamente debajo del tiempo, porque la marca usa una fila flexible. Defectos abiertos: 1 S2/P1; 0 S1, S3 y S4. El contenido y los contadores superaron las comprobaciones en memoria; quedan pruebas integradas a cargo del PM.

## Alcance cubierto

- Diff revisado: **12 archivos**, `3ad328ebb4306a2eec2da514c1968e434216f1dd..c7d48387f9a9e5cfbeac114a4db50977a3c219b7`, obtenido con `git merge-base oliver132123/records-schema HEAD`. Rama verificada: `oliver132123/records-sitio`; `git status --short` vacío antes y después de las comprobaciones.
- Objeto: `/Users/oliverinfante/orca/workspaces/lainfanteria-next/lainfanteria-next-records-sitio`. Todas las referencias relativas siguientes parten de ese worktree. Ningún archivo del objeto fue modificado; ninguna consulta a servicios locales o remotos.
- Leídos los seis documentos del encargo y `docs/pm/backlog/EPICA-records.md`; inspeccionados el diff completo, dependencias puras y tests de récords.
- **Vigencia del gate:** registra `e5cd3ad468606cd0aa61914f44f1cefa0ccf54c7`, distinto del HEAD actual. `git diff e5cd3ad..HEAD --stat` muestra exclusivamente `gate-r1.txt` y `pruebas-pm-r1.txt` (162 líneas documentales). Código, configuración y tests son idénticos: se acepta la evidencia del gate para este objeto, sin fingir igualdad literal de hashes.
- Técnicas aplicadas: particiones de equivalencia; valores límite 0/1/2 en contador y cifras inválidas; tabla de decisión cifras × alcance × vigencia; revisión de ramas; transición vigente → superado por comparación de estados; error guessing de CSS, enlaces, hidratación y regresión por comparación con la base. No se ejecutaron transiciones de DB ni flujos del panel, fuera de alcance.
- Ejecutado: `npx tsc --noEmit --incremental false` → **exit 0, sin salida**.
- Ejecutado: `node` por entrada estándar, transpilación de los módulos existentes mediante `typescript.transpileModule` y `react-dom/server.renderToStaticMarkup`, todo en memoria → **exit 0**. Se comprobaron 32 combinaciones, lista vacía, 9 variantes de fuente, 2 cifras inconsistentes y 3 combinaciones de metadatos. Se suministraron objetos de entrada directamente; no se importó ni simuló una capa de DB. El import de CSS fue sustituido en el cargador: esta prueba valida HTML/texto, **no layout, CSS ni hidratación**.
- Evidencia ejecutada por PM: `docs/pm/tareas/T-003/gate-r1.txt:32` en adelante: typegen, tsc, lint, 8 archivos / **135 tests verdes**, build exitoso. No se repitieron `typegen`, `vitest`, build ni dev porque escriben en el worktree; no se corrieron suites contra producción.
- Evidencia visual del PM: `docs/pm/tareas/T-003/pruebas-pm-r1.txt:5`, viewports 1280, 730 y 400 px, con las limitaciones explícitas de ese documento. No hubo sesión visual independiente de QA.
- Alcance respetado: no cambian admin, nosotros, migraciones ni `lib/{records,types,datos}.ts`. El helper adicional `records-texto.ts` y sus tests están autorizados por la sección 5 del brief; los otros archivos adicionales son documentación de la tarea.
- Next 16: contrastados `PageProps`, `await params`, `generateStaticParams` y `Image fill/sizes` con las guías instaladas `01-app/03-api-reference/03-file-conventions/page.md`, `04-functions/generate-static-params.md`, `02-components/image.md` y la guía de Server/Client Components. No se introduce uso incompatible; `Records` no lleva `use client` y sus dependencias son puras. Se mantiene `revalidate = 60` en `app/(sitio)/layout.tsx:9`.

### Tabla de decisión y cobertura

La prueba en memoria cruzó las cuatro filas de cifras con cuatro alcances y dos estados (**32 casos**). Los metadatos se comprobaron como particiones adicionales, no como producto cartesiano exhaustivo.

| Cifras válidas | Principal vigente | Secundaria | Superado |
| -- | -- | -- | -- |
| Tiempo + velocidad | Tiempo, tres decimales | `@ velocidad unidad`; posición defectuosa D01 | Marca completa · título · fecha opcional |
| Solo tiempo | Tiempo | Ninguna | Tiempo · título · fecha opcional |
| Solo velocidad | Velocidad con unidad | Ninguna | Velocidad · título · fecha opcional |
| Ninguna | Título del hito | Ninguna | Título · fecha opcional |

| Alcance | Etiqueta vigente | Suma vigente | Suma superado |
| -- | -- | -- | -- |
| nacional | RÉCORD NACIONAL, con o sin cifras | 1 | 0 |
| pista | RÉCORD DE PISTA | 0 | 0 |
| evento | RÉCORD DE EVENTO | 0 | 0 |
| ninguno | RÉCORD con cifras / HITO sin cifras | 0 | 0 |

- Tiempo 0 sin otra cifra válida y velocidad sin unidad → hito, sin `null s` ni `NaN`; si queda una cifra válida, esa sigue siendo principal. Evidencia: `Records.tsx:65`, `lib/records.ts:34` y comprobaciones en memoria.
- Auto solo, lugar solo y ambos: unión sin separadores iniciales/finales. Sin ambos no se emite la línea; fecha y categoría son condicionales (`Records.tsx:71`). Sin vigentes pero con superados se emite solo historial bajo el título del bloque (`Records.tsx:38,46`).

### Evaluación de los tests del dev

`tests/unidad/records-texto.test.ts:26` contiene seis tests de resultados observables: singular, plural y cuatro formas de historial. Una regresión a plural único o a separadores incondicionales haría fallar estos tests; eliminar la implementación impediría importarlos. No mockean DB. Los tests heredados `tests/unidad/records.test.ts` cubren formateadores, filtros, hitos nacionales y cifras inconsistentes. Ninguno de estos tests verifica disposición CSS, integración del contador en la tarjeta o hidratación; por eso el gate verde no detecta D01. El dev declaró expresamente la falta de confirmación visual de CA-3/12, y el PM aportó esa evidencia: no se registra un defecto de proceso por esa limitación declarada.

## Trazabilidad de criterios

| CA | Resultado | Evidencia |
| -- | --------- | --------- |
| CA-1 | **NO CUMPLE** | `app/(sitio)/_componentes/Records.tsx:81` y `records.module.css:44`: tiempo y velocidad son hermanos en flex-row; no se garantiza «debajo». Resto del contenido confirmado por SSR y evidencia PM, filas 11–12. D01. |
| CA-2 | CUMPLE | `Records.tsx:89`, CSS `.hito:68`; título destacado sin truncamiento. PM: hito largo completo, `pruebas-pm-r1.txt:13`. |
| CA-3 | CUMPLE | `Records.tsx:31,40` preserva orden filtrado; CSS `:18` y `:160`; PM `:14`: 3 columnas desktop, una a 730/400 y altura pareja. |
| CA-4 | CUMPLE | `Records.tsx:46`, `records-texto.ts:26`; seis tests de texto en gate y SSR de todos los estados superados, incluso lista solo histórica. PM `:15`. |
| CA-5 | CUMPLE | `Records.tsx:14,74,97`: filtro http(s), target y rel correctos; SSR rechazó javascript, data, ftp, ruta protocol-relative, vacío y null; aceptó http, https y HTTPS. Pendiente integración de navegador, detallada abajo. |
| CA-6 | CUMPLE | `Records.tsx:29` retorna null; `page.tsx:74` filtra contador cero. SSR vacío = cadena vacía; comparación del diff no añade nodos residuales. PM miembro C, `:17`. |
| CA-7 | CUMPLE | `app/(sitio)/equipo/[slug]/page.tsx:162`: bloque después de Biografía y antes de Galería; ambos bloques anteriores mantienen sus condiciones. |
| CA-8 | CUMPLE | `page.tsx:61,68`: helper canónico, posición inmediatamente posterior a Trofeos, singular/plural y filtro >0. Evidencia PM parcial del contador 3; orden confirmado estáticamente. |
| CA-9 | **NO VERIFICABLE** | Guarda `seccionActiva('equipo')` → `notFound()` intacta en `page.tsx:52`; no se apagó la sección ni se verificó respuesta HTTP/ISR. |
| CA-10 | CUMPLE | `MiembroCard.tsx:36,64`, `records-texto.ts:12`; cuenta nacionales vigentes con o sin cifras, texto real y emoji aria-hidden. Límite 2 cubierto por test; PM observa 1 y 3. |
| CA-11 | CUMPLE | `MiembroCard.tsx:64`, condición >0: ninguna inserción DOM con 0. Helper excluye pista/evento/sin alcance/superados; comparación con base y evidencia PM de B/C, `:19`. |
| CA-12 | **NO VERIFICABLE** | PM `:20` confirma scrollWidth=400 con datos existentes y hito largo, pero no el caso literal `10.000 s` / `@ 241.5 mph` pedido. CSS con wrapping; se requiere completar ese dato exacto y comprobar ausencia de corte interno, no solo scroll global. |
| CA-13 | **NO VERIFICABLE** | Helpers deterministas y sin nuevas fuentes temporales; consola dev limpia informada por PM `:5`, que expresamente limita la validación en `:23`. No se ejecutó hidratación de build local. |
| CA-14 | CUMPLE | `page.tsx:111` h1; `Records.tsx:36` h2 y `:48` h3, sin salto. PM `:21`. |

## Defectos

### T-003-D01 — La velocidad secundaria puede quedar al lado del tiempo

- **Severidad / Prioridad:** S2 / P1. Se aplica la escala del brief: CA explícito incumplido; requiere corregirse antes de aprobar el merge.
- **Área:** ui.
- **Ubicación:** `app/(sitio)/_componentes/records.module.css:44`; `app/(sitio)/_componentes/Records.tsx:81`.
- **Pasos / condición:** mostrar un récord vigente con tiempo y velocidad válidos en una ficha cuyo ancho disponible permita alojar ambos textos juntos; por ejemplo valores breves como `1.000 s` y `@ 1 mph`, o ampliar el ancho de ficha en el breakpoint de una columna.
- **Esperado:** según CA-1, tiempo principal y, **debajo**, velocidad secundaria más pequeña en una línea propia, independientemente del espacio libre.
- **Obtenido:** `.marca` usa `display:flex`, `align-items:baseline`, `flex-wrap:wrap` y no establece dirección de columna ni salto obligatorio. Sus dos spans quedan en la misma fila mientras quepan; la velocidad solo baja por falta de espacio.
- **Evidencia:** `Records.tsx:82–83` emite dos spans hermanos. En `records.module.css:44–50`, dirección inicial `row`; `.marcaSecundaria:61` solo establece color/tamaño/peso. La media query `:160` tampoco cambia esa dirección. Razonamiento reproducible de layout: si ancho principal + gap + ancho secundario ≤ ancho interno, flex-wrap no crea segunda línea. El HTML SSR o que un ancho particular fuerce wrapping no demuestra el requisito para los demás anchos. `pruebas-pm-r1.txt:11` confirma tamaños distintos pero no registra coordenadas que garanticen posición vertical.
- **Sugerencia:** imponer dos filas o dirección vertical para la marca, manteniendo jerarquía tipográfica; verificar ambos spans mediante sus bounding boxes en desktop y mobile, con cifras cortas y largas.
- **Introducido por:** este cambio (`9a19ad5`, componente y CSS nuevos).

## Riesgos y preguntas (sin evidencia suficiente para defecto)

- El gate de build termina verde con `PGRST200` por relación records ausente en el entorno consultado. Es la dependencia de despliegue ya documentada en `EPICA-records.md`, no un defecto nuevo de T-003; no demuestra prerenderizado correcto con los datos reales. No se repitió esa consulta.
- T-003 parte del T-001 anterior a las rondas 2/3: antes de integración final corresponde repetir el gate con la base definitiva. No se atribuyen a T-003 cambios ausentes de su merge-base.
- **Inicial subrayada:** confirmado preexistente con `git show 3ad328e:app/(sitio)/equipo/MiembroCard.tsx` y el CSS de esa misma base. El Link que envuelve el placeholder y las reglas `.pilotPhotoWrap` / `.pilotPhotoPlaceholder` no fueron modificados; concuerda con `pruebas-pm-r1.txt:26`. Se excluye de la numeración de defectos.
- No se verificaron palabras indivisibles de 200 caracteres ni casos extremos del distintivo. El wrapping estático reduce el riesgo, pero la prueba de scroll global no detecta todos los recortes internos.
- No hay cambios de DB, auth, storage, RPC, formularios, secretos o hosts de imágenes que activen el resto del checklist de seguridad/migración; no se probaron esos subsistemas por esta tarea.

## Pruebas a ejecutar por el PM

- **D01 / CA-1:** en el entorno local autorizado, mostrar tiempo+velocidad con textos cortos y largos a 1280, 730 y 400 px. Medir `getBoundingClientRect()` de ambos spans: el borde superior del secundario debe quedar debajo del inferior del principal. QA no levantó servidor ni abrió una sesión visual.
- **CA-5 integrado:** montar `Records` con props de prueba `fuente_url='javascript:alert(1)'`, `data:`, `//example.com`, null y http(s), mediante un harness aislado que no modifique CHECKs ni DB compartida. Los no permitidos no deben generar anchor; los permitidos deben conservar target/rel. Ya pasó SSR en memoria; falta la ejecución integrada solicitada, sin navegar hacia servicios externos.
- **CA-9:** con una ventana coordinada sobre el entorno local, desactivar equipo y verificar `curl -i http://localhost:3013/equipo/t003-miembro-a` → 404, incluyendo una ruta previamente visitada tras el intervalo de revalidación; restaurar el estado. QA no puede mutar la tabla compartida.
- **CA-12:** suministrar exactamente `tiempo_s=10`, `velocidad=241.5`, `unidad_velocidad='mph'`, junto a hito de 200 caracteres, y comprobar a 400 px que se ven completos `10.000 s`, `@ 241.5 mph` y el hito, sin scroll horizontal ni clipping. Añadir una palabra larga sin espacios como prueba de robustez.
- **CA-13:** ejecutar build/start con configuración explícitamente local, visitar listado y perfiles con/sin récords y recargar/navegar con distintas zonas horarias del navegador. Consola sin errores de hidratación; QA no puede ejecutar build/dev ni validar hidratación con SSR estático.
- **Regresión de integración:** comprobar juntos trofeos + nacionales + campeonatos en cabecera (orden), un miembro solo con superados (sin badge), y la transición vigente → superado: desaparece de grilla y contador, aparece en historial después de revalidar. No simular ni mockear DB; coordinar cualquier cambio de datos con quienes usan la instancia local.
