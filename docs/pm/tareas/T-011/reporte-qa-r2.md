# Reporte QA T-011 — ronda 2

**Veredicto:** FAIL  
**Resumen:** D02 y D03 están corregidos; D01 queda **PARTIAL**: la guardia funciona durante un montaje, pero cerrar y reabrir la misma galería permite operaciones simultáneas y publicaciones obsoletas. La RPC conserva las barreras de seguridad y cuenta con evidencia favorable de ejecución local.

## Alcance cubierto

- **Diff completo:** 14 archivos, `38141fb1e8e6bbc78225ef2e20e50438c3833278...160eab5814738e04d1d7906a05c31974685c904b`.
- **Rama comprobada:** `oliver132123/fotos-orden`.
- **Archivos adicionales:** ocho archivos de documentación —tablero, briefs, entrega, gate anterior, pruebas del PM y reporte anterior— justificados por el seguimiento de la tarea. La incorporación de T-012 al tablero es coordinación documental; no incluye implementación.
- **Fuera de alcance protegido:** 0012, `AutosAdmin.tsx`, `ProductosAdmin.tsx` y `lib/datos.ts` no aparecen modificados.
- **Técnicas:** particiones de equivalencia, valores límite, tabla de decisión, transición de estados —incluido desmontaje/remontaje—, revisión de ramas y condiciones, confirmation testing, regresión y error guessing.
- **Ejecutado aquí:** `./node_modules/.bin/tsc --noEmit --incremental false` → **exit 0**, sin salida. Incremental desactivado para evitar escritura de caché.
- **Gate del PM:** el HEAD de `gate-r2.txt:4` coincide exactamente con el actual. Typegen, tsc y lint correctos; **260 tests / 12 archivos aprobados** (`gate-r2.txt:41`, `:47`, `:51`, `:69`).
- **Evidencia del panel:** corresponde a `7c44922` (`pruebas-pm-r2.txt:14`). `git diff --stat 7c44922 HEAD` muestra únicamente la incorporación de ese informe; no cambió código.
- **Evidencia SQL:** migración sin cambios respecto de la ejecutada en r1; r2 agrega multidimensionales, límite inferior cero y productos (`pruebas-pm-r2.txt:2`).
- **No ejecutado aquí:** Vitest, build, navegador ni Supabase, por las restricciones de escritura/red. No se contactaron servicios remotos.
- **Estado final:** únicamente `?? docs/pm/tareas/T-011/gate-r2.txt`, igual que al comenzar.

Referencias abreviadas: `SubirFotos.tsx` está en `app/(admin)/(panel)/admin/_componentes/`; `AutosAdmin.tsx` y `ProductosAdmin.tsx`, en los directorios `autos/` y `productos/` del mismo panel. Los documentos citados están en `docs/pm/tareas/T-011/`. `0014` y `0012` designan sus respectivas migraciones.

## Trazabilidad de criterios

| CA | Resultado | Evidencia |
| -- | --------- | --------- |
| CA-1 | CUMPLE | `0014:59`, `:60`, `:68`, `:207`: security definer, search_path fijo, autorización inicial y permisos. No admin/anon rechazados: `pruebas-pm-r1.txt:9`. |
| CA-2 | CUMPLE | Allowlist idéntica a 0012, devuelve la columna; identificadores mediante `%I` (`0014:74`, `:124`, `:169`, `:182`). Tablas inválidas: `pruebas-pm-r1.txt:13`. |
| CA-3 | CUMPLE | Clave exactamente igual en `0014:114` y `0012:67`. Espera entre sesiones verificada en `pruebas-pm-r1.txt:50`. |
| CA-4 | CUMPLE | Bloqueo y validación de unicidad, pertenencia y cardinalidad (`0014:124`, `:131`, `:139`, `:148`). Casos negativos: `pruebas-pm-r1.txt:15`; multidimensionales: `pruebas-pm-r2.txt:4`. |
| CA-5 | CUMPLE | Retorno sin UPDATE (`0014:155`); galería vacía ejecutada correctamente (`pruebas-pm-r1.txt:39`). |
| CA-6 | CUMPLE | Baja de principal previa, asignación por ordinalidad y comprobación de filas (`0014:170`, `:183`, `:194`). Resultados: `pruebas-pm-r1.txt:31`, `pruebas-pm-r2.txt:6`. |
| CA-7 | CUMPLE | Segunda llamada conserva estado (`pruebas-pm-r1.txt:33`, `pruebas-pm-r2.txt:9`); UPDATE cuenta también filas con valores iguales (`0014:183`). |
| CA-8 | **NO CUMPLE** | D01: el bloqueo no sobrevive al cierre/reapertura de la galería. El recorrido normal sí tiene evidencia favorable (`pruebas-pm-r2.txt:20`). |
| CA-9 | CUMPLE — revisión estática y ejecución parcial | DELETE → RPC → bucket → publicación en `finally` (`SubirFotos.tsx:257`, `:277`, `:300`, `:305`). Bucket fallido y promoción comprobados (`pruebas-pm-r2.txt:40`). Falta ejecución específica de RPC fallida después del DELETE. |
| CA-10 | CUMPLE — revisión estática y ejecución parcial | Primera principal y agregado al final conservados (`SubirFotos.tsx:148`, `:156`, `:173`). Subida sobre galería existente comprobada (`pruebas-pm-r2.txt:31`); vacía pendiente. |
| CA-11 | CUMPLE | Ayuda solicitada en `SubirFotos.tsx:439`. |
| CA-12 | **NO CUMPLE** | D01 permite publicar `[a,b,A]` después de guardar `[b,a]`, aunque la base conserve `[b,a,A]`. |
| CA-13 | **NO CUMPLE integralmente** | RPC y movimiento en productos comprobados (`pruebas-pm-r2.txt:8`, `:45`), pero comparte D01: cierre/remontaje y callback capturado (`ProductosAdmin.tsx:82`, `:167`, `:383`). |

### Tabla de decisión de CA-4

Precondiciones: admin, tabla permitida y padre no nulo.

| Entrada | Resultado |
| -- | -- |
| `NULL` / contiene `NULL` | `22004` |
| `{}` con galería vacía | Éxito, sin UPDATE |
| `{}` con galería no vacía | `23514` |
| Repetidos, incluso compensando un faltante | `23505` |
| Uno de menos | `23514` |
| Uno de más ajeno | `23503` |
| Sustitución por ID de otro padre | `23503` |
| ID de otra tabla ausente de la galería objetivo | `23503` |
| ID inexistente | `23503` |
| Multidimensional | `2202E` |
| Permutación exacta, incluso con límite inferior 0 | Éxito; orden consecutivo y primera posición real principal |

Evidencia: `pruebas-pm-r1.txt:15`, `:31`, `:39`; `pruebas-pm-r2.txt:4`. Sin repetidos, todos pertenecientes e igual cardinalidad implica igualdad de conjuntos. Todos los rechazos preceden al primer UPDATE (`0014:170`).

La comparación con 0012 no detectó debilitamientos: las diferencias agregan validación del arreglo, bloqueo de todas las filas, ordinalidad y comprobación de cardinalidad. La baja previa evita colisionar con el índice único; una excepción posterior revierte ambos UPDATE (`0014:169`, `:196`).

## Confirmación de defectos anteriores

| ID | Estado | Evidencia |
| -- | ------ | --------- |
| T-011-D01 | **PARTIAL** | Subir, mover, ★ y borrar usan la misma guardia durante un montaje (`SubirFotos.tsx:93`, `:114`, `:197`, `:242`). La reproducción original pasa (`pruebas-pm-r2.txt:31`), pero el candado se recrea al reabrir y el callback anterior sigue publicando: defecto detallado abajo. |
| T-011-D02 | **FIXED — estático; ejecución actual pendiente** | Lecturas exigen `r.ok`, precondición ≥2 fotos, sin fallback e IDs invertidos (`tests/seguridad/rls.test.ts:220`, `:239`, `:251`, `:256`). Los 50 tests de seguridad registrados son anteriores a este fix (`pruebas-pm-r1.txt:3`, `:58`). |
| T-011-D03 | **FIXED** | Publicación en `finally` después del DELETE exitoso (`SubirFotos.tsx:305`); RPC y bucket tienen manejo de errores. Ejecución con bucket abortado y comprobación pantalla/base (`pruebas-pm-r2.txt:40`). |

## Defectos

### T-011-D01 — Cerrar y reabrir la galería evade la guardia y permite publicar una lista anterior

- **Severidad / Prioridad:** S2 / P1.
- **Área:** ui / concurrencia / ciclo de vida.
- **Ubicación:** `SubirFotos.tsx:87`, `:173`; `AutosAdmin.tsx:98`, `:190`, `:287`, `:458`.
- **Pasos / condición:**
  1. Abrir una galería `[a,b]`.
  2. Iniciar subida A y mantener pendiente el upload, antes del INSERT.
  3. Cerrar el modal y reabrir el mismo auto mientras A sigue pendiente.
  4. En la nueva instancia, mover `b` al primer lugar y esperar éxito de la RPC: base y pantalla `[b,a]`.
  5. Dejar terminar A.
- **Esperado:** CA-8 y la §7 del brief impiden operaciones cruzadas; CA-12 exige que ningún callback publique una lista obsoleta.
- **Obtenido:** la subida anterior inserta A al final y publica `[a,b,A]` desde su captura inicial. La base conserva `[b,a,A]`, con `b` principal; la pantalla recibe `[a,b,A]`, con `a` principal.
- **Evidencia:** deducción reproducible del flujo:
  - El candado pertenece a la instancia: `useState(() => crearCandado(setOcupado))` (`SubirFotos.tsx:87`).
  - Cerrar sigue habilitado y pone `abierto=false` (`AutosAdmin.tsx:98`, `:294`); el render condicional desmonta la galería (`:287`).
  - Reabrir monta otra instancia con candado libre (`:91`, `:458`), sin cancelar la operación anterior.
  - A calcula su inserción y publicación desde el `fotos` original (`SubirFotos.tsx:148`, `:156`, `:173`).
  - El callback capturado sigue actualizando el padre montado mediante `setEditando` y `setAutos` (`AutosAdmin.tsx:190`). Desmontar el hijo no invalida ese callback.
  - Productos repite el patrón (`ProductosAdmin.tsx:82`, `:167`, `:383`).
- **Sugerencia:** mantener exclusión y vigencia de resultados durante todo el ciclo de la galería, incluyendo desmontaje/remontaje; impedir que operaciones anteriores publiquen snapshots obsoletos. Agregar únicamente una `key` no resuelve esta secuencia: el cierre ya desmonta el componente. Escalar al PM si la solución requiere modificar los padres excluidos del alcance.
- **Introducido por:** este cambio en combinación con el ciclo de cierre preexistente; **la corrección de ronda 2 no cierra toda la clase de D01**.
- **Límite de comprobación:** confirmado por análisis del flujo; no reproducido en navegador en este sandbox.

## Evaluación de los tests del dev

- Los tests de movimiento y normalización comprueban resultados, límites e inmutabilidad; no sustituyen la base por mocks (`tests/unidad/galeria.test.ts:22`, `:76`).
- Los siete tests del candado verifican exclusión, duración y liberación ante excepción mediante promesas controladas (`:170`, `:192`). La entrega registra mutaciones que provocan cinco fallos por variante (`entrega-dev.md:56`); no repetí esas mutaciones.
- **Revertir solo la integración de `SubirFotos.tsx` dejaría estos tests verdes.** Tampoco cubren dos instancias del componente, cierre/reapertura ni callbacks obsoletos. La propia entrega reconoce la limitación (`entrega-dev.md:78`).
- D02 ahora falla por precondición incumplida o lectura HTTP fallida y exige específicamente `42501`; no aprueba por cualquier error (`tests/seguridad/rls.test.ts:222`, `:244`, `:268`).
- Las pruebas del PM usan base local real; la inyección de fallos HTTP está documentada en `pruebas-pm-r2.txt:17`. No encontré mocks de la capa de datos en los tests agregados.
- Permanecen sin evidencia ejecutada específica: DELETE exitoso + RPC fallida, subida inicial vacía, sesión expirada y cierre/reapertura en vuelo. La rama defensiva `25000` tampoco tiene prueba registrada (`0014:196`).

## Riesgos y preguntas (sin evidencia suficiente para defecto)

- **Intervalo entre liberación y render:** el candado se libera antes de que necesariamente se hayan actualizado los manejadores del DOM (`lib/galeria.ts:115`); input/drop siguen disponibles (`SubirFotos.tsx:417`, `:430`). La entrega lo reconoce; requiere reproducción controlada, distinta del D01 confirmado.
- **Borrado no atómico:** sigue aceptado; si falla la renormalización puede quedar una galería sin principal. La lista conserva las restantes sin inventar normalización (`SubirFotos.tsx:274`, `:284`; `entrega-dev.md:145`).
- **Concurrencia externa:** los locks no impiden nuevas inserciones desde otra pestaña; `FOR UPDATE` bloquea filas existentes (`0014:124`). Documentado en `entrega-dev.md:217`.
- **IDs entre tablas:** un número existente en ambas no expresa procedencia; la comprobación efectiva es pertenencia a la tabla y padre seleccionados (`0014:139`).
- **Checklist restante:** el diff no agrega páginas, redirects, hosts, fechas, slugs, secretos ni APIs nuevas de Next. No crea tablas ni modifica RLS. La migración usa `create or replace` y la entrega documenta reversión y aplicación previa al merge (`0014:52`; `entrega-dev.md`, sección Migraciones).
- **Teclado:** el fallo inicial de opacidad tiene una remedición favorable tras la transición CSS; no lo considero defecto confirmado (`pruebas-pm-r2.txt:53`).

## Pruebas a ejecutar por el PM

Todas exclusivamente contra entorno local, sin mocks de datos:

- **D01, secuencia detallada arriba:** demorar upload antes del INSERT, cerrar/reabrir, reordenar, completar upload. Comparar IDs, orden y principal en pantalla/base. Repetir en productos.
- **Seguridad de ronda 2:** ejecutar la configuración `vitest.seguridad.config.mts` con URL y credenciales locales. Verificar éxito con ≥2 fotos, fallo explícito sin esa precondición y fallo ante lectura HTTP errónea. El gate unitario no ejecuta esta suite.
- **DELETE exitoso + RPC rechazada:** la borrada debe desaparecer, mostrarse el aviso y mantenerse los valores reales de las restantes; no restaurar la foto eliminada.
- **Subida inicial vacía y fallo parcial de lote:** primera inserción exitosa principal; filas ya insertadas visibles aunque una posterior falle (`SubirFotos.tsx:148`, `:170`).
- **Sesión expirada y drop externo sobre grilla:** comprobar rollback/aviso y ausencia de reordenamiento o navegación accidental.
- Tras corregir D01, repetir gate y recorrido local del panel. No ejecuté estas pruebas porque requieren escritura, navegador o servicios locales fuera del sandbox autorizado.