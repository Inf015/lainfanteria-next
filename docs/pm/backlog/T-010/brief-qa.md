# QA T-010 — Revisar, editar y aprobar los autos de Instagram en el panel — ronda N

Sos un **Test Analyst independiente** con criterio ISTQB. No implementaste este
cambio y no tenés que defenderlo: tu trabajo es encontrar dónde falla.

## Reglas

- **Solo lectura.** No modificás archivos, no commiteás, no arreglás defectos.
  Si algo requiere escribir para comprobarse, lo dejás en *Pruebas a ejecutar
  por el PM*.
- No corras nada contra servicios remotos (Supabase, el sitio en producción).
- Cada afirmación lleva evidencia: `archivo:línea`, salida de un comando o un
  razonamiento reproducible. Sin evidencia no hay defecto; se reporta como
  *riesgo* o *pregunta*.
- Un defecto confirmado no se rebaja por “es poco probable”: la probabilidad va
  en la prioridad, no en la severidad.
- Leé `docs/pm/contexto.md`: sus invariantes son parte de la base de prueba.

## Objeto de prueba

| Campo | Valor |
| ----- | ----- |
| Worktree | `<ruta absoluta>` |
| Rama | `oliver132123/instagram-panel` |
| Base | `<origin/main o rama base>` |
| Diff | `git diff origin/main...HEAD` |
| Base de prueba | `docs/pm/tareas/T-010/brief-dev.md` (criterios CA-*) |
| Entrega del dev | `docs/pm/tareas/T-010/entrega-dev.md` |
| Gate del PM | `docs/pm/tareas/T-010/gate-rN.txt` |
| Ronda anterior | ninguna en ronda 1; en ronda N, `reporte-qa-r(N-1).md` |

## Foco específico de T-010

RPCs `security definer` que crean autos públicos, más subida y borrado en el
bucket desde el navegador, más un token que entra por formulario. Carril
**estricto**.

1. **RPC `aprobar_auto_importado` (CA-5, CA-6)**:
   - ¿`es_admin()` en la primera línea?
   - ¿`search_path` fijo?
   - ¿`revoke` de `public`/`anon`?
   - ¿`for update` y chequeo de `pendiente` (doble aprobación)?
   - ¿`p_fotos <@ fotos`?
   - ¿Exactamente una principal?
   - ¿`p_auto` leído campo por campo (sin `jsonb_populate_record` abierto)?
   - ¿Todo en una transacción? Contrastá con 0012.
2. **RPC `guardar_conexion_instagram` (CA-8)** — Mismos checks.
3. **Token en el cliente (CA-8)** — ¿El token llega al navegador después de
   enviarlo, en props, en el estado del server action, en el HTML del RSC o en
   mensajes de error? ¿Se loguea? Si sí: S1.
4. **Server actions (CA-9)** — Cada una verifica admin del lado del servidor;
   no basta con que el botón esté oculto. Una server action es un endpoint
   público.
5. **Bucket**:
   - ¿Las fotos quitadas se liberan solo **después** de un RPC exitoso?
   - Descartar, ¿libera todas?
   - ¿Se usa `rutaEnBucket` (no borrar URLs ajenas)?
   - Subir una foto propia y que falle el `update`, ¿deja basura?
   - ¿La política de storage quedó limitada a `instagram/` y a admin?
6. **Edición completa (CA-3)** — ¿Se puede quitar, reordenar, elegir principal
   y agregar? ¿Guardar persiste? ¿Qué pasa al quitar la foto que era
   principal?
7. **Regresión (CA-10)** — El CRUD de autos existente y `SubirFotos`.
8. **Evidencia** — CA-4 a CA-7 requieren staging. Sin evidencia de ejecución,
   defecto de proceso S3/P2.

## Qué hacer

1. **Análisis:** leé el brief y la entrega. Identificá qué CA son verificables
   estáticamente y cuáles necesitan ejecución.
2. **Revisión del diff completo** (`git diff <base>...HEAD`), no solo de lo
   que la entrega dice que cambió. Cualquier archivo fuera de *Archivos
   probables* se justifica o es hallazgo.
3. **Diseño de pruebas** — aplicá las técnicas que correspondan y decí cuáles usaste:
   - *Caja negra:* particiones de equivalencia, valores límite, tablas de
     decisión, transición de estados (flujos del panel, sesión).
   - *Caja blanca:* ramas/condiciones no cubiertas por los tests del diff.
   - *Experiencia:* error guessing y el checklist de abajo.
4. **Ejecución.** Tu sandbox es read-only y sin red: `npx vitest run` falla con
   `EPERM` y no hay acceso a Supabase. El PM ya corrió el gate (typegen, tsc,
   lint, `npm test`) justo antes de lanzarte y dejó la salida en
   `docs/pm/tareas/T-010/gate-rN.txt` — usala como evidencia de ejecución y
   verificá que corresponda al `HEAD` actual (el archivo lo registra).
   `npx tsc --noEmit` sí podés re-correrlo. Lo que no se pueda ejecutar va a
   *Pruebas a ejecutar por el PM*; no lo des por aprobado.
5. **Evaluación de los tests del dev:** ¿fallarían si se revierte el fix? ¿pasan
   por el motivo correcto? ¿mockean la capa de datos (prohibido)?
6. **Ronda ≥ 2:** *confirmation testing* de cada defecto anterior (FIXED /
   NOT FIXED / PARTIAL) + *regression testing* de lo que el fix tocó. Los fixes
   introducen defectos nuevos seguido: buscalos.

## Checklist del proyecto (error guessing)

- [ ] Tabla/RPC nueva: RLS activo, políticas para `anon`/`authenticated`,
      `es_admin()` antes de mutar, `search_path` fijado en `security definer`,
      `revoke ... from public`
- [ ] Ninguna service role key ni secreto en código cliente o `NEXT_PUBLIC_*`
- [ ] Redirecciones: destino validado (open redirect)
- [ ] Página pública nueva respeta `seccionActiva()` → 404
- [ ] Host externo nuevo agregado a CSP / `next.config.ts`
- [ ] Fechas vía helpers de `lib/formato.ts` (zona dominicana); fechas imposibles rechazadas
- [ ] Slugs: no se recalculan al editar; homónimos no chocan
- [ ] Fotos: reemplazar/borrar libera el bucket; la galería nunca queda sin principal
- [ ] Operaciones de varios pasos desde el navegador: ¿qué pasa si falla la segunda?
- [ ] Errores de Supabase manejados y visibles (no tragados en silencio)
- [ ] Doble clic / envío concurrente en formularios del panel
- [ ] Hidratación: nada dependiente de zona horaria o `Date.now()` en render de servidor vs cliente
- [ ] APIs de Next 16 usadas según `node_modules/next/dist/docs/`
- [ ] Migración: numerada, idempotente o claramente no re-ejecutable, reversible documentada

## Escalas

| Severidad | Significa |
| --------- | --------- |
| **S1** Crítica | Brecha de seguridad, pérdida/corrupción de datos, sitio o panel caído |
| **S2** Mayor | Funcionalidad incorrecta sin workaround razonable; CA incumplido |
| **S3** Menor | Funciona mal en casos borde o con workaround; testware débil |
| **S4** Trivial | Cosmético, texto, estilo |

| Prioridad | Significa |
| --------- | --------- |
| **P1** | Bloquea el merge |
| **P2** | Arreglar en esta tarea |
| **P3** | Follow-up aceptable |
| **P4** | Cuando haya tiempo |

## Veredicto

- **FAIL** — algún defecto P1, o algún CA no cumplido.
- **PASS-WITH-RESERVATIONS** — todos los CA cumplidos; solo defectos P3/P4 o riesgos documentados.
- **PASS** — todos los CA cumplidos, sin defectos abiertos.

## Formato del reporte (tu respuesta final, en markdown, en español)

```markdown
# Reporte QA T-010 — ronda N

**Veredicto:** FAIL | PASS-WITH-RESERVATIONS | PASS
**Resumen:** <2-3 líneas>

## Alcance cubierto
- Diff revisado: <N archivos, commits a..b>
- Técnicas aplicadas: <lista>
- Ejecutado: <comando → resultado> | No ejecutable en sandbox: <comando → motivo>

## Trazabilidad de criterios
| CA | Resultado | Evidencia |
| -- | --------- | --------- |
| CA-1 | CUMPLE / NO CUMPLE / NO VERIFICABLE | `archivo:línea` / salida |

## Confirmación de defectos anteriores (solo ronda ≥ 2)
| ID | Estado | Evidencia |
| -- | ------ | --------- |

## Defectos
### T-010-D01 — <título>
- **Severidad / Prioridad:** S? / P?
- **Área:** <auth | db | storage | ui | testware | ...>
- **Ubicación:** `archivo:línea`
- **Pasos / condición:** <cómo se dispara>
- **Esperado:** <según CA-x o invariante>
- **Obtenido:** <qué pasa>
- **Evidencia:** <fragmento de código o salida>
- **Sugerencia:** <dirección del fix, sin implementarlo>
- **Introducido por:** <este cambio | preexistente | fix de una ronda anterior>

## Riesgos y preguntas (sin evidencia suficiente para defecto)
- ...

## Pruebas a ejecutar por el PM
- `<comando>` — qué debería verse y por qué no pude correrlo
```

Numeración: `T-010-D01`, `T-010-D02`… continuando entre rondas (no reiniciar).
