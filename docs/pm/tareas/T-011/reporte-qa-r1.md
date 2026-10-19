# Reporte QA T-011 — ronda 1

**Veredicto:** FAIL  
**Resumen:** La RPC conserva las barreras de 0012 y cuenta con evidencia favorable de ejecución local. Hay un incumplimiento de CA-8/CA-12: dos subidas simultáneas permiten desbloquear prematuramente el reordenamiento y después sobrescribir su resultado local. La interacción real del panel sigue pendiente de ejecución.

## Alcance cubierto

- **Diff completo:** 11 archivos, `38141fb1e8e6bbc78225ef2e20e50438c3833278...453888099eb9d143816151611a3b119d779a264a`.
- **Rama:** `oliver132123/fotos-orden`, confirmada por comando.
- **Archivos adicionales:** los cinco archivos fuera de *Archivos probables* son documentación del PM y entrega: tablero, briefs, entrega y pruebas locales. Justificados por los commits y el flujo de QA. La fila T-012 del tablero es coordinación del PM; no hay implementación de esa tarea.
- **Fuera de alcance protegido:** 0012, `AutosAdmin.tsx`, `ProductosAdmin.tsx` y `lib/datos.ts` no aparecen modificados.
- **Técnicas:** particiones de equivalencia, valores límite, tabla de decisión, transiciones de estados, revisión de ramas y condiciones, error guessing.
- **Ejecutado:** `./node_modules/.bin/tsc --noEmit --incremental false` → **exit 0**, sin salida. Se desactivó incremental para evitar escribir caché.
- **Evidencia del PM:** gate con HEAD idéntico al actual; typegen, tsc y lint correctos; **253 tests / 12 archivos aprobados** (`docs/pm/tareas/T-011/gate-r1.txt:31`).
- **SQL y seguridad:** evidencia local del PM; **50 tests aprobados** (`docs/pm/tareas/T-011/pruebas-pm-r1.txt:58`). Registra `36c63cb`; `git diff 36c63cb HEAD` solo agrega ese informe, sin cambios de código.
- **No ejecutado aquí:** Vitest, build, navegador y Supabase, por las restricciones indicadas. No se contactaron servicios remotos ni se modificaron archivos.
- **Estado final:** únicamente `?? docs/pm/tareas/T-011/gate-r1.txt`, igual que al comenzar.

En las referencias siguientes, `SubirFotos.tsx` corresponde a `app/(admin)/(panel)/admin/_componentes/SubirFotos.tsx`; `0014` corresponde a `supabase/migrations/0014_reordenar_fotos.sql`.

## Trazabilidad de criterios

| CA | Resultado | Evidencia |
| -- | --------- | --------- |
| CA-1 | CUMPLE | `0014:59`, `:68`, `:207`: security definer, path fijo, autorización inicial y permisos. PM: `pruebas-pm-r1.txt:9`, `:47`. |
| CA-2 | CUMPLE | `0014:74`: allowlist devuelve la columna; identificadores mediante `%I`. Tablas inválidas rechazadas en `pruebas-pm-r1.txt:13`. |
| CA-3 | CUMPLE | Expresión del lock idéntica en `0014:114` y `0012_foto_principal_atomica.sql:67`. Espera real entre sesiones: `pruebas-pm-r1.txt:50`. |
| CA-4 | CUMPLE | `0014:96`, `:124`, `:131`, `:139`, `:148`: nulos, bloqueo, unicidad, pertenencia y cardinalidad. Casos negativos ejecutados: `pruebas-pm-r1.txt:15`. |
| CA-5 | CUMPLE | Salida sin UPDATE en `0014:155`; ejecución vacía correcta en `pruebas-pm-r1.txt:39`. |
| CA-6 | CUMPLE | Baja previa de principal en `0014:170`, asignación por ordinalidad en `:183`, comprobación de filas en `:194`. Resultados SQL: `pruebas-pm-r1.txt:31`. |
| CA-7 | CUMPLE | UPDATE sin filtro que excluya valores ya iguales; segunda llamada correcta en `pruebas-pm-r1.txt:33`. |
| CA-8 | **NO CUMPLE** | Bloqueo prematuramente liberado por subidas simultáneas: D01. Botones, drag y CSS existen; falta ejecución de interacción. |
| CA-9 | CUMPLE — revisión estática | DELETE → RPC → bucket → `onCambio` en `SubirFotos.tsx:219`. Error de RPC conserva `restantes`, sin reintroducir la borrada. Riesgo aceptado documentado en `entrega-dev.md:156`. |
| CA-10 | CUMPLE — revisión estática | Cálculo de primera foto y agregado al final conservados en `SubirFotos.tsx:127`, `:136`, `:151`. El diff solo agrega la guardia frente a reordenamiento/borrado. |
| CA-11 | CUMPLE | Texto completo solicitado en `SubirFotos.tsx:397`. |
| CA-12 | **NO CUMPLE** | D01 permite enviar a `onCambio` una lista anterior después de guardar correctamente un reordenamiento. |
| CA-13 | **NO VERIFICABLE integralmente** | Componente compartido y allowlist correctos; PM registra SQL de productos en `pruebas-pm-r1.txt:41`. No hay ejecución del panel de productos; además comparte D01. |

### Tabla de decisión de CA-4

Precondición: admin autorizado, tabla permitida y padre no nulo.

| Entrada | Resultado esperado y observado en evidencia del PM |
| -- | -- |
| `NULL` o contiene `NULL` | `22004`; sin cambios |
| `{}` y galería vacía | Éxito sin cambios |
| `{}` y galería no vacía | `23514` |
| Repetido compensando un faltante | `23505`, incluso con igual longitud |
| Repetido aumentando longitud | `23505` |
| Falta un ID | `23514` |
| Sobra un ID ajeno | `23503` |
| Sustituye uno por ID de otro padre | `23503` |
| ID de otra tabla, ausente de la galería objetivo | `23503` |
| ID inexistente | `23503` |
| Permutación exacta | Éxito; orden consecutivo y una principal |

Evidencia: `pruebas-pm-r1.txt:15` a `:40`. El razonamiento de conjunto es válido: **sin repetidos + todos pertenecen + igual cardinalidad implica igualdad de conjuntos**. Los rechazos preceden al primer UPDATE (`0014:170`).

## Evaluación de los tests del dev

- Los 17 tests de `tests/unidad/galeria.test.ts` comprueban resultados concretos, límites e inmutabilidad; fallarían ante errores de movimiento o normalización. No mockean datos.
- **No prueban la integración:** revertir únicamente el comportamiento de `SubirFotos.tsx`, manteniendo los helpers, dejaría estos tests verdes. En particular, «borrar la principal…» solo filtra un array y normaliza (`tests/unidad/galeria.test.ts:119`); no verifica DELETE, RPC ni manejo de errores.
- No están ejercitadas automáticamente las ramas de error/rollback, segunda operación en vuelo, subidas superpuestas, MIME de drag ni visibilidad táctil. La exclusión de pruebas de navegador está autorizada por el brief, pero requiere comprobación manual.
- El test de seguridad exige correctamente `42501`; eliminar la RPC produciría un error distinto y no pasaría. No distingue por sí solo revocación de EXECUTE y chequeo `es_admin()`, limitación reconocida por el PM (`pruebas-pm-r1.txt:66`).
- Hay una debilidad adicional en su precondición: D02.

## Defectos

### T-011-D01 — Dos subidas liberan el bloqueo antes de tiempo y pueden pisar un reordenamiento guardado

- **Severidad / Prioridad:** S2 / P1.
- **Área:** ui / concurrencia.
- **Ubicación:** `SubirFotos.tsx:74`, `:89`, `:151`, `:153`.
- **Pasos / condición:**
  1. Abrir una galería `[a,b]`.
  2. Iniciar una subida A y, antes de terminar, otra B desde el input o mediante drop.
  3. Mantener B pendiente antes de insertar su fila; dejar terminar A. La pantalla pasa a `[a,b,A]`.
  4. Reordenar a `[b,a,A]` y dejar que la RPC termine correctamente.
  5. Dejar terminar B.
- **Esperado:** CA-8 mantiene el bloqueo mientras exista una operación en curso; CA-12 conserva una lista coherente con el orden persistido.
- **Obtenido:** al terminar A se habilita reordenar aunque B siga pendiente. B termina enviando `[a,b,B]`, calculado desde su captura inicial: oculta A y restaura localmente el orden y la principal anteriores. La base conserva el reordenamiento ya confirmado para las filas existentes.
- **Evidencia:** deducción reproducible del flujo:
  - `subir()` solo rechaza si `ocupadoRef.current` es true (`:93`); las subidas no activan ese ref.
  - Cada subida reemplaza `subiendo` (`:99`) y lo pone incondicionalmente en cero al terminar (`:153`).
  - El bloqueo depende de `subiendo > 0` (`:74`).
  - Cada subida publica su captura de `fotos` mediante `onCambio([...fotos, ...nuevas])` (`:151`).
  - Input y drop siguen invocando `subir()` (`:378`, `:387`).
- **Sugerencia:** serializar las subidas y las operaciones de galería con una guardia síncrona común, o mantener correctamente todas las operaciones pendientes y reconciliar sus resultados.
- **Introducido por:** este cambio en su interacción con el nuevo reordenamiento; la posibilidad de superponer subidas es preexistente. No se reprodujo en navegador dentro del sandbox.

### T-011-D02 — La prueba de seguridad puede aprobar sin una galería existente

- **Severidad / Prioridad:** S3 / P3.
- **Área:** testware.
- **Ubicación:** `tests/seguridad/rls.test.ts:230`.
- **Pasos / condición:** ejecutar la prueba sin fotos visibles para anon.
- **Esperado:** verificar la precondición de galería existente para sostener la comprobación de «orden sin cambios» requerida en el brief.
- **Obtenido:** usa `autoId = 1`, envía `[1]` y compara dos listas vacías; puede aprobar sin comprobar preservación de ninguna galería.
- **Evidencia:** fallback explícito en líneas 233 y 235; comparación en línea 248. Tampoco se exige éxito HTTP en el helper de lectura (`:219`).
- **Sugerencia:** usar una galería local conocida y exigir la precondición y lecturas exitosas; preferiblemente dos fotos para que invertir cambie realmente el orden.
- **Introducido por:** este cambio.

## Riesgos y preguntas (sin evidencia suficiente para defecto)

- **Interacción pendiente:** drag real, teclado, táctil, sesión expirada y rollback solo tienen evidencia estática. CSS contempla `:focus-within` y `(hover: none)` en `app/(admin)/admin.module.css:678`.
- **Borrado no atómico:** riesgo expresamente aceptado y documentado; no se reporta como defecto nuevo (`entrega-dev.md:156`).
- **Storage tras DELETE:** `onCambio` ocurre después de esperar al bucket (`SubirFotos.tsx:262`). Una excepción no absorbida en ese paso impediría actualizar la lista; `lib/storage.ts:88` no tiene `catch`. Falta comprobar si el cliente real puede producir ese rechazo, por lo que queda como riesgo.
- **IDs entre tablas:** ambas tablas tienen identidades independientes (`0001_esquema_inicial.sql:99`, `:136`). Un número presente en ambas no identifica su procedencia: la RPC solo puede validar pertenencia en la tabla seleccionada. Conviene precisar esa interpretación de CA-4.
- **INSERT concurrente externo:** `FOR UPDATE` protege filas existentes, no nuevas inserciones. Está reconocido en `entrega-dev.md:164`; no equivale a serialización de todas las operaciones de galería.
- **Checklist restante:** el diff no introduce páginas públicas, redirects, hosts, fechas, slugs ni APIs nuevas de Next. No agrega secretos. La migración conserva RLS existente, usa `create or replace` y documenta reversión en la entrega.

## Pruebas a ejecutar por el PM

Todas contra entorno **local**, sin mocks de la capa de datos:

- **Reproducción manual de D01:** dos subidas con latencia controlada; completar A, reordenar, completar B. Comparar pantalla, filas persistidas y estado tras recargar.
- **Panel de autos y productos:** arrastrar primera↔última; ◀/▶ en extremos; ★; navegación con Tab/Enter; dispositivo táctil. Verificar orden persistido tras recargar.
- **Errores y estados:** demorar RPC, intentar segundo movimiento y borrado; rechazar RPC y comprobar rollback; DELETE exitoso seguido de RPC fallida debe quitar definitivamente la foto de pantalla y mostrar aviso.
- **Drops:** miniatura sobre zona de subida no debe activar subida; archivo externo sobre miniatura no debe reordenar ni navegar fuera del panel.
- **Storage:** provocar fallo después de DELETE y comprobar que la lista local sigue reflejando la eliminación.
- **SQL local adicional:** arreglos multidimensionales → `2202E`; límite inferior cero → primera posición real como principal; repetir inversión/idempotencia con varias fotos de productos. Estos casos no tienen salida detallada en el informe del PM.
- **`npm run build`**, con configuración local controlada: la entrega declara éxito, pero el gate actual no lo incluye. No lo ejecuté porque genera archivos.