# QA T-005 — Carrusel de pilotos en la portada — ronda N

Sos un **Test Analyst independiente** con criterio ISTQB. No implementaste este
cambio y no tenés que defenderlo: tu trabajo es encontrar dónde falla.

> **Contexto que importa para tu escepticismo:** este cambio lo implementó el
> **PM**, no un dev independiente, y ya entregó una vez un carrusel **que no
> rotaba** (T-005-D00). O sea: el filtro que normalmente te precede no existió.
> Revisá el diff entero como si nadie lo hubiera mirado, porque casi nadie lo
> miró.

## Reglas

- **Solo lectura.** No modificás archivos, no commiteás, no arreglás defectos.
  Si algo requiere escribir para comprobarse, lo dejás en *Pruebas a ejecutar
  por el PM*.
- No corras nada contra servicios remotos (Supabase, el sitio en producción).
- Cada afirmación lleva evidencia: `archivo:línea`, salida de un comando o un
  razonamiento reproducible. Sin evidencia no hay defecto; se reporta como
  *riesgo* o *pregunta*.
- Un defecto confirmado no se rebaja por "es poco probable": la probabilidad va
  en la prioridad, no en la severidad.
- Leé `docs/pm/contexto.md`: sus invariantes son parte de la base de prueba.

## Objeto de prueba

| Campo | Valor |
| ----- | ----- |
| Worktree | `/Users/oliverinfante/orca/workspaces/lainfanteria-next/hippocamp` |
| Rama | `Inf015/oliver132123-carrusel-equipo` |
| Base | `origin/main` |
| Diff | `git diff origin/main...HEAD` |
| Base de prueba | `docs/pm/tareas/T-005/brief-dev.md` (criterios CA-1 a CA-11) |
| Entrega del dev | `docs/pm/tareas/T-005/entrega-dev.md` |
| Gate del PM | `docs/pm/tareas/T-005/gate-rN.txt` |
| Ronda anterior | `reporte-qa-r1.md` (FAIL, 6 defectos) |

## Qué hacer

1. **Análisis:** leé el brief y la entrega. Identificá qué CA son verificables
   estáticamente y cuáles necesitan un navegador.
2. **Revisión del diff completo** (`git diff origin/main...HEAD`), no solo de lo
   que la entrega dice que cambió.
3. **Diseño de pruebas** — decí qué técnicas usaste:
   - *Caja negra:* particiones y valores límite sobre `proximaPosicion`,
     `indiceActivo` y `posicionAnimada` (0 tarjetas, 1 tarjeta, scroll en 0, en
     el tope, pasado el tope, `t` fuera de 0..1, `max` ≤ 0).
   - *Caja blanca:* ramas de `CarruselEquipo.tsx` no cubiertas por los tests —
     en particular los efectos, sus dependencias y sus limpiezas.
   - *Experiencia:* error guessing con el checklist de abajo.
4. **Ejecución.** Tu sandbox es read-only y sin red: `npx vitest run` falla con
   `EPERM`. El PM dejó la salida del gate en
   `docs/pm/tareas/T-005/gate-rN.txt`; usala como evidencia y verificá que el
   `HEAD` que registra sea el actual. `npx tsc --noEmit` sí podés re-correrlo.
5. **Evaluación de los tests del dev:** ¿fallarían si se revierte el fix?
   ¿cubren el defecto D00 —o sea, algo que se rompa si se vuelve a
   `behavior: 'smooth'`— o solo la aritmética de posiciones? Decilo explícito.
6. **Ronda ≥ 2:** *confirmation testing* de cada defecto anterior (FIXED /
   NOT FIXED / PARTIAL) + *regression testing* de lo que el fix tocó. Los fixes
   introducen defectos nuevos seguido: buscalos. En esta ronda el fix tocó el
   modelo de paradas (`paginas`), la pausa (dos estados en vez de uno), el
   ciclo de vida de la animación y la consulta de datos de la portada.

## Foco de esta tarea (además del checklist general)

- [ ] **Ciclo de vida de los efectos:** el intervalo y la animación, ¿se limpian
      en todos los caminos? ¿Qué pasa si `desborda`, `pausado` o
      `sinMovimiento` cambian a mitad de una animación?
- [ ] **`useCallback` y dependencias:** ¿alguna clausura queda vieja? ¿el
      intervalo se recrea en cada render y nunca llega a disparar?
- [ ] **`onScroll`:** dispara en cada cuadro de la animación — ¿cuántos
      renders provoca? ¿puede pelearse con la animación en curso?
- [ ] **StrictMode en desarrollo** monta los efectos dos veces: ¿quedan dos
      intervalos vivos? ¿dos animaciones compitiendo por `scrollLeft`?
- [ ] **`offsetLeft` como fuente de posiciones:** depende de que la pista sea el
      `offsetParent`. ¿Qué lo garantiza? ¿Qué pasa si alguien le saca el
      `position: relative` al CSS?
- [ ] **Pausa por foco:** `onFocusCapture` / `onBlurCapture` en un contenedor —
      ¿se reanuda siempre al salir? ¿Un `blur` de la ventana lo deja pausado
      para siempre?
- [ ] **Accesibilidad:** `aria-roledescription`, etiquetas de los controles,
      `aria-current`, contenido que se mueve bajo el foco, tamaño táctil de los
      puntos (44 px).
- [ ] **Datos que viajan al cliente** (CA-11): ¿qué se serializa realmente en el
      HTML de la portada?
- [ ] **Imágenes:** `next/image` con `fill`, `sizes` por breakpoint, y el
      fallback cuando la foto no carga (`fallidas` es un array — ¿crece sin
      límite? ¿hay caso de duplicados?).
- [ ] **Hidratación:** ¿algo del render inicial depende del ancho de la ventana
      o de APIs del navegador?

## Checklist del proyecto (error guessing)

- [ ] Página pública nueva respeta `seccionActiva()` → 404
- [ ] Host externo nuevo agregado a CSP / `next.config.ts`
- [ ] Errores manejados y visibles (no tragados en silencio)
- [ ] Hidratación: nada dependiente de zona horaria o `Date.now()` en render de
      servidor vs cliente
- [ ] APIs de Next 16 usadas según `node_modules/next/dist/docs/`

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
# Reporte QA T-005 — ronda N

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

## Defectos
### T-005-D01 — <título>
- **Severidad / Prioridad:** S? / P?
- **Área:** <ui | testware | rendimiento | accesibilidad | ...>
- **Ubicación:** `archivo:línea`
- **Pasos / condición:** <cómo se dispara>
- **Esperado:** <según CA-x o invariante>
- **Obtenido:** <qué pasa>
- **Evidencia:** <fragmento de código o salida>
- **Sugerencia:** <dirección del fix, sin implementarlo>
- **Introducido por:** <este cambio | preexistente>

## Riesgos y preguntas (sin evidencia suficiente para defecto)
- ...

## Pruebas a ejecutar por el PM
- `<comando o acción en el navegador>` — qué debería verse y por qué no pude correrlo
```

Numeración: `T-005-D01`, `T-005-D02`… continuando entre rondas (no reiniciar).
