# QA T-002 — Récords en el panel: alta, edición y baja — ronda N

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
| Rama | `oliver132123/records-panel` |
| Base | `<origin/main o rama base>` |
| Diff | `git diff <base>...HEAD` |
| Base de prueba | `docs/pm/tareas/T-002/brief-dev.md` (criterios CA-*) |
| Entrega del dev | `docs/pm/tareas/T-002/entrega-dev.md` |
| Gate del PM | `docs/pm/tareas/T-002/gate-rN.txt` |
| Ronda anterior | ninguna en ronda 1; en ronda N, `reporte-qa-r(N-1).md` |

## Foco específico de T-002

Panel de administración, cliente de navegador escribiendo en la base. La RLS ya
protege contra no-admins (T-001); acá importa que el admin **no pueda romper
datos por error** y que la UI no mienta sobre lo que quedó en la base.

1. **Validación (`lib/records-form.ts`)** — particiones y límites del CA-4/CA-5:
   `'9,874'`, `'9.874'`, `'1.234,5'`, `'1e3'`, `'0x10'`, `'  '`, `'.5'`, `'5.'`,
   `'99999.999'`, `'100000'`, `'0.0001'`, `'-0'`, año `'2024.5'`, `'1949'`.
   Ojo con `Number('')` = `0`, `Number(' ')` = `0` y `parseFloat('9abc')` = `9`.
2. **URL de fuente** — `javascript:`, `JAVASCRIPT:`, `' javascript:'`, `data:`,
   `//evil.com`, `https:` sin host. La base tiene CHECK, pero el mensaje tiene que
   salir antes.
3. **Transiciones de estado del modal** — cerrado → lista → alta → guardando →
   (ok | error) → lista; editar A y después abrir alta: ¿el formulario queda con
   datos de A? Cambiar de miembro con el modal abierto. Cerrar mientras guarda.
4. **Doble envío (CA-8)** — ¿el botón se deshabilita **antes** del `await`? ¿Hay
   otro camino de envío (Enter en un input) que lo esquive?
5. **Consistencia UI ↔ base** — tras un error, ¿la lista local queda como antes?
   En «Marcar superado», ¿se actualiza el estado solo después de la respuesta
   (o revierte si falla)? Tras editar, ¿la fila local se reemplaza con lo que
   devolvió la base (`.select().single()`) o con lo que se mandó?
6. **Estado compartido (CA-12)** — `MiembrosAdmin` recibe los cambios; al
   reabrir el modal, ¿se ven? ¿La columna de trofeos y la Galería siguen igual?
7. **Alcance** — el diff **no** puede tocar `app/(sitio)/`, `lib/records.ts`,
   `lib/types.ts` ni `lib/datos.ts`. Si los toca: S2/P1 (rompe el paralelismo
   con T-003).
8. **Evidencia manual** — si la entrega marca como hechos CA de interfaz sin
   haber levantado el entorno local, es defecto de proceso (S3/P2).

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
   `docs/pm/tareas/T-002/gate-rN.txt` — usala como evidencia de ejecución y
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
# Reporte QA T-002 — ronda N

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
### T-002-D01 — <título>
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

Numeración: `T-002-D01`, `T-002-D02`… continuando entre rondas (no reiniciar).
