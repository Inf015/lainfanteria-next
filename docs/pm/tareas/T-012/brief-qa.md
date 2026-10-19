# QA T-012 — Vista previa del auto en el panel — ronda 3

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
| Worktree | `/Users/oliverinfante/Code/lainfanteria-next-autos-vista-previa` |
| Rama | `oliver132123/autos-vista-previa` |
| Base | `origin/main` |
| Diff | `git diff origin/main...HEAD` |
| Base de prueba | `docs/pm/tareas/T-012/brief-dev.md` (criterios CA-*) |
| Entrega del dev | `docs/pm/tareas/T-012/entrega-dev.md` |
| Gate del PM | `docs/pm/tareas/T-012/gate-rN.txt` |
| Ronda anterior | `reporte-qa-r2.md` (PASS-WITH-RESERVATIONS; D05 cerrado por el PM; D06 confirmado por el PM) |
| Carril | **Normal** — una pasada de QA |
| Verificación manual del PM | `pruebas-pm-r1.txt`, `pruebas-pm-r2.txt` y `pruebas-pm-r3.txt` |

## Qué hacer

1. **Análisis:** leé el brief y la entrega. Identificá qué CA son verificables
   estáticamente y cuáles necesitan ejecución.
2. **Revisión del diff completo** (`git diff origin/main...HEAD`), no solo de lo
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
   `docs/pm/tareas/T-012/gate-rN.txt` — usala como evidencia de ejecución y
   verificá que corresponda al `HEAD` actual (el archivo lo registra).
   `npx tsc --noEmit` sí podés re-correrlo. Lo que no se pueda ejecutar va a
   *Pruebas a ejecutar por el PM*; no lo des por aprobado.
5. **Evaluación de los tests del dev:** ¿fallarían si se revierte el fix? ¿pasan
   por el motivo correcto? ¿mockean la capa de datos (prohibido)?
6. **Ronda ≥ 2:** *confirmation testing* de cada defecto anterior (FIXED /
   NOT FIXED / PARTIAL) + *regression testing* de lo que el fix tocó. Los fixes
   introducen defectos nuevos seguido: buscalos.

## Ronda 3 (última)

Confirmation testing de D06 (sección 6 del brief, bloque «Ronda 3»): **ningún**
camino que cierre el editor o cambie de registro puede dejar la vista previa
abierta para la próxima edición, y «Vista previa» queda deshabilitado mientras
se guarda. Regression testing de D01–D04 sobre lo que tocó el fix. D05 lo cerró
el PM con mutaciones contra Supabase real (`pruebas-pm-r2.txt`): confirmalo con
esa evidencia, no lo reabras salvo que la evidencia no corresponda.

## Ronda 2 (histórico)

Confirmation testing de D01–D04 (sección 6 del brief) y regression testing de
lo que tocó el fix. El brief pide corregir **clases**: verificá que el índice
del detalle sea válido en **todo** cambio de fotos (otro auto, 0 fotos, fotos
que llegan, fotos que se borran), que **todo** lo que está detrás del diálogo
activo sea inerte, y que **ningún** `skip` de `autos.spec.ts` dependa de la UI
bajo prueba. Si se tocó `DetalleAuto`, revisá el impacto en `/autos`. La
enmienda de CA-8 (Escape en dos pasos) es decisión del PM: no la reportes como
defecto.

## Puntos centrales de esta tarea

1. **El refactor del sitio es el riesgo mayor (CA-1, CA-2).** La página
   `/autos` es pública y no tenía pruebas. Compará `AutosGrid.tsx` de la base
   con los componentes nuevos: ¿se perdió algún handler (teclado, scroll lock,
   cleanup del `useEffect`), alguna clase, algún atributo `aria-*`, el `sizes`
   de `next/image`, el texto de WhatsApp? ¿El índice de foto se resetea al
   abrir otro auto? ¿`fotos.length = 0` puede dar `% 0` → `NaN`?
2. **Prueba de navegador.** ¿Falla si se revierte el comportamiento que dice
   cubrir? ¿Cuando no hay autos se salta con motivo o pasa vacía? ¿Depende de
   datos de producción de una forma frágil?
3. **Vista previa = lo que guardaría el formulario (CA-4, CA-6).** Compará la
   función pura con `guardar()` de `AutosAdmin.tsx`: mismo `trim`, mismo
   vacío → `null`, misma validación de precio. Una divergencia es un defecto:
   la vista previa mentiría.
4. **Estado del modal (CA-8).** Abrir y cerrar la vista previa no puede
   alterar el formulario, cerrar el modal de edición, disparar
   `router.refresh()` ni perder fotos recién subidas. `Escape` con la vista
   previa abierta: ¿lo agarra también algún listener del modal de fondo o el
   del detalle público?
5. **WhatsApp inerte (CA-7)** sin romper el link real del sitio.
6. **Fuera de alcance:** `SubirFotos.tsx`, `admin.module.css`, `lib/datos.ts` y
   `lib/csp.ts` no deberían aparecer en el diff (los dos primeros los toca
   T-011 en paralelo).

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
# Reporte QA T-012 — ronda N

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
### T-012-D01 — <título>
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

Numeración: `T-012-D01`, `T-012-D02`… continuando entre rondas (no reiniciar).
