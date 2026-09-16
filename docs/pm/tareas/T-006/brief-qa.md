# QA T-006 — Pruebas de navegador con Playwright — ronda N

Sos un **Test Analyst independiente** con criterio ISTQB. No implementaste este
cambio y no tenés que defenderlo: tu trabajo es encontrar dónde falla.

> **Lo que se está probando acá es testware.** Una suite que pasa no vale nada
> si pasa por el motivo equivocado, o si seguiría pasando con el defecto
> reintroducido. Ese es el centro de esta revisión: **¿estas pruebas fallan
> cuando deben fallar?**

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
| Worktree | `/Users/oliverinfante/orca/workspaces/lainfanteria-next/lainfanteria-next-pruebas-navegador` |
| Rama | `oliver132123/pruebas-navegador` |
| Base | `origin/Inf015/oliver132123-carrusel-equipo` |
| Diff | `git diff origin/main...HEAD` |
| Base de prueba | `docs/pm/tareas/T-006/brief-dev.md` (criterios CA-1 a CA-10) |
| Entrega del dev | `docs/pm/tareas/T-006/entrega-dev.md` |
| Gate del PM | `docs/pm/tareas/T-006/gate-rN.txt` |
| Ronda anterior | `reporte-qa-r1.md` (FAIL, 5 defectos) |
| Contexto | Cierra `T-005-D06`; ver `docs/pm/tareas/T-005/reporte-qa-r2.md` |

## Qué hacer

1. **Análisis:** leé el brief, la entrega y el reporte de T-005 que originó la
   tarea. Entendé exactamente qué defecto tiene que atrapar la suite.
2. **Revisión del diff completo** (`git diff origin/main...HEAD`).
3. **El punto central — sensibilidad de las pruebas.** Para cada prueba,
   preguntate qué mutación del código de producción la haría fallar. En
   particular:
   - ¿La prueba de CA-2 falla de verdad si el componente vuelve a
     `scrollTo({ behavior: 'smooth' })`? El dev dice haberlo demostrado en la
     entrega: **verificá que lo que pegó corresponde a la prueba que está en el
     diff**, y que el cambio no quedó puesto.
   - ¿Alguna prueba pasaría aunque el carrusel estuviera roto? Buscá
     aserciones vacías, `expect` sobre valores que siempre se cumplen, esperas
     que tragan el fallo, `try/catch`, `.catch(() => {})`, `test.skip`
     condicional demasiado ancho (CA-9 pide saltar sin pilotos: ¿podría saltar
     siempre y nadie se enteraría?).
   - ¿Las pruebas de pausa (CA-4, CA-5) distinguen "pausado" de "todavía no
     pasó el intervalo"? Una prueba que mira el scroll antes de que el
     temporizador dispare pasa siempre.
4. **Flakiness.** ¿Hay `waitForTimeout` con números mágicos? ¿Depende de la
   velocidad de la máquina, de la animación de 450 ms, del orden de las
   pruebas? ¿Corre en paralelo y se pisa?
5. **Aislamiento.** ¿La suite escribe en la base? ¿Depende de cuántos pilotos
   haya cargados, de sus nombres, de que la sección esté activa? ¿Apunta a
   producción o a un servidor local?
6. **Ejecución.** Tu sandbox es read-only y sin red: no vas a poder correr
   Playwright (descarga navegadores, levanta un servidor). `npx tsc --noEmit`
   sí. El PM corrió el gate y dejó la salida en
   `docs/pm/tareas/T-006/gate-rN.txt`; verificá que corresponda al `HEAD`
   actual. Todo lo que no puedas ejecutar va a *Pruebas a ejecutar por el PM*;
   no lo des por aprobado.

## Checklist de esta tarea

- [ ] `npm test` no levanta los `.spec.ts` de Playwright, y Playwright no
      levanta los `.test.ts` de Vitest. ¿Qué lo garantiza?
- [ ] El `webServer` compila el sitio (`build` + `start`), no `next dev`: en
      desarrollo React monta los efectos dos veces y el temporizador no se
      comporta como para el visitante.
- [ ] El puerto elegido no choca con otro proceso; si está ocupado, ¿falla con
      un mensaje claro o reutiliza un servidor ajeno y prueba otra cosa?
- [ ] Los selectores usan roles y etiquetas accesibles, no clases de CSS
      Modules (cambian en cada build).
- [ ] Resultados de Playwright fuera del control de versiones.
- [ ] La dependencia nueva es `devDependency`, con versión fijada.
- [ ] Nada de `.env*` versionado ni secretos en la configuración.
- [ ] La suite no deja procesos vivos ni puertos ocupados al terminar.
- [ ] La documentación (README, `contexto.md`) dice cómo correrla, incluido el
      `playwright install` que hace falta la primera vez.

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

> Una prueba que no puede fallar es **S2**, no S3: da una garantía falsa, que es
> peor que no tener prueba.

## Veredicto

- **FAIL** — algún defecto P1, o algún CA no cumplido.
- **PASS-WITH-RESERVATIONS** — todos los CA cumplidos; solo defectos P3/P4 o riesgos documentados.
- **PASS** — todos los CA cumplidos, sin defectos abiertos.

## Formato del reporte (tu respuesta final, en markdown, en español)

```markdown
# Reporte QA T-006 — ronda N

**Veredicto:** FAIL | PASS-WITH-RESERVATIONS | PASS
**Resumen:** <2-3 líneas>

## Alcance cubierto
- Diff revisado: <N archivos, commits a..b>
- Técnicas aplicadas: <lista>
- Ejecutado: <comando → resultado> | No ejecutable en sandbox: <comando → motivo>

## Trazabilidad de criterios
| CA | Resultado | Evidencia |
| -- | --------- | --------- |

## Sensibilidad de las pruebas
| Prueba | Mutación que debería hacerla fallar | ¿Falla? | Evidencia |
| ------ | ----------------------------------- | ------- | --------- |

## Defectos
### T-006-D01 — <título>
- **Severidad / Prioridad:** S? / P?
- **Área:** <testware | tooling | documentación | ...>
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
- `<comando>` — qué debería verse y por qué no pude correrlo
```

Numeración: `T-006-D01`, `T-006-D02`… continuando entre rondas (no reiniciar).
