# T-006 — Pruebas de navegador con Playwright

| Campo | Valor |
| ----- | ----- |
| Rama | `oliver132123/pruebas-navegador` |
| Worktree | `/Users/oliverinfante/orca/workspaces/lainfanteria-next/lainfanteria-next-pruebas-navegador` |
| Base | `origin/Inf015/oliver132123-carrusel-equipo` |
| Tipo | test |
| Migración | No |
| Ronda | 2 — defectos de `reporte-qa-r1.md` |

**Antes de empezar leé `docs/pm/contexto.md` entero.** Sus reglas ganan sobre
este brief.

## 1. Por qué

El carrusel de pilotos de la portada (T-005) se entregó una vez **sin rotar**.
Pedía el desplazamiento con `scrollTo({ behavior: 'smooth' })`, y el navegador
no arranca esa animación cuando el paso lo dispara un temporizador en vez de un
clic: el temporizador corría, el destino se calculaba bien, y el scroll no se
movía. Lo encontró el dueño del proyecto mirando la pantalla.

QA lo dejó abierto como **T-005-D06 (S3/P1)**: ninguna prueba falla si alguien
vuelve a esa implementación. El invariante del proyecto —*todo bug arreglado
lleva su test que falla sin el fix*— sigue incumplido.

No se puede cubrir con lo que hay. Vitest corre sobre Node, y jsdom no sirve:
no implementa scroll ni layout, así que `scrollLeft` sería siempre 0 y la
prueba no distinguiría una implementación de la otra. Hace falta un navegador
de verdad.

Además hay dos criterios de T-005 que **nadie verificó todavía**: la pausa con
el puntero encima y con el foco dentro. Se corrigieron leyendo el código.

## 2. Alcance

**Dentro:**
- Playwright como dependencia de desarrollo, con su configuración y el script
  `npm run test:navegador`.
- Una suite en `tests/navegador/` con las pruebas del carrusel de la portada.
- Documentar cómo se corre, en el README del repo y en `docs/pm/contexto.md`
  (sección de pruebas), al mismo nivel que las otras tres suites.

**Fuera (no tocar aunque parezca relacionado):**
- El código del carrusel. Esta tarea **prueba**, no arregla. Si encontrás un
  defecto, va a *Fuera de alcance que vi* en la entrega — no lo corrijas.
- Las suites de unidad, seguridad y humo.
- Pruebas de navegador de otras páginas (panel, autos, merch). Otra tarea.
- CI / GitHub Actions.

## 3. Archivos probables

- `package.json` (devDependency + script)
- `playwright.config.ts`
- `tests/navegador/carrusel.spec.ts`
- `.gitignore` (resultados de Playwright)
- `README.md`, `docs/pm/contexto.md`

## 4. Criterios de aceptación

- **CA-1** — Dado el repo recién clonado, cuando se corre
  `npm ci && npx playwright install chromium && npm run test:navegador`,
  entonces la suite levanta el sitio sola y pasa, sin que haya que arrancar un
  servidor a mano en otra terminal.
- **CA-2** — Dada la portada con el carrusel desbordando, cuando pasa el
  intervalo de rotación **sin ninguna interacción**, entonces `scrollLeft` de
  la pista **cambió**, y avanzó a la parada siguiente, no a cualquier lado.
  Esta es la prueba que cierra T-005-D06.
- **CA-3** — Dado el carrusel en su última parada, cuando pasa el intervalo,
  entonces vuelve al principio (`scrollLeft` = 0).
- **CA-4** — Dado el carrusel rotando, cuando el puntero se posa sobre el
  bloque, entonces `scrollLeft` **no cambia** mientras el puntero siga ahí, y
  vuelve a cambiar al salir. (Cubre T-005-CA-6, sin verificar hasta hoy.)
- **CA-5** — Dado el carrusel rotando, cuando el foco del teclado entra en el
  bloque (Tab), entonces `scrollLeft` no cambia mientras el foco siga dentro,
  **incluso si el puntero entra y sale**. (Es el defecto T-005-D01.)
- **CA-6** — Dados los controles, cuando se pulsa `›` en la última parada,
  entonces vuelve al principio; cuando se pulsa `‹` en la primera, entonces va
  al final; cuando se pulsa el último punto, entonces el scroll llega al tope y
  ese punto queda con `aria-current="true"`.
- **CA-7** — Dado `prefers-reduced-motion: reduce`, cuando se abre la portada y
  pasa el intervalo, entonces el carrusel **no** rota solo.
- **CA-8** — Dado que se revierte el fix —cambiar en `CarruselEquipo.tsx` la
  llamada a `animarScroll` por `pista.scrollTo({ left: destino, behavior:
  'smooth' })`—, entonces **la prueba de CA-2 falla**. Hay que demostrarlo:
  hacer el cambio, correr la suite, pegar la salida del fallo en la entrega, y
  **revertirlo** (que no quede en el diff).
- **CA-9** — Dada una portada sin pilotos o con la sección `equipo` apagada,
  cuando corre la suite, entonces las pruebas del carrusel **se saltan** con un
  motivo legible, no fallan. Las pruebas no pueden depender de cuántos pilotos
  haya cargados hoy.
- **CA-10** — La suite no escribe en la base ni depende de datos concretos
  (nombres, cantidades). Solo lee la portada.

## 5. Pruebas requeridas

- [ ] Navegador: lo de arriba, en `tests/navegador/carrusel.spec.ts`.
- [ ] Unidad / seguridad / humo: **no se tocan**, pero tienen que seguir verdes.
- [ ] `npm test` no debe intentar correr la suite de navegador (son comandos
      distintos; que Vitest no levante los `.spec.ts` de Playwright ni al revés).

## 6. Defectos a corregir (ronda 2)

De `docs/pm/tareas/T-006/reporte-qa-r1.md` (veredicto **FAIL**). Corregí solo
estos. Cada fix lleva su prueba o su evidencia de que ahora sí detecta el
problema.

| ID | Sev / Pri | Resumen | Esperado |
| -- | --------- | ------- | -------- |
| T-006-D01 | S2 / P1 | El `test.skip` es tan ancho que un carrusel roto —botón que no renderiza, hidratación que falla, etiqueta cambiada— sale como "seis pruebas omitidas" y nadie se entera | Distinguir la ausencia legítima de datos (sección apagada, sin pilotos, equipo que entra sin desbordar) de un fallo de renderizado. Medir el desborde y, si lo hay, **exigir** los controles |
| T-006-D02 | S2 / P1 | `reuseExistingServer: !process.env.CI` puede enganchar cualquier servidor que esté en el 3015 y probar otra cosa sin compilar HEAD | No reutilizar servidores tampoco en local; ante un puerto ocupado, fallar con un mensaje claro |
| T-006-D03 | S2 / P1 | CA-4 y CA-5 pausan **antes** de que haya un paso en curso: cubren "no empieza otro", no "se detiene el que va". Quitar el efecto que cancela la animación (`CarruselEquipo.tsx:119`) no haría fallar ninguna prueba | Demostrar movimiento, entrar con puntero o foco **durante los 450 ms** de la animación, y comprobar que el scroll queda donde estaba. Es el defecto T-005-D02, hoy sin cobertura |
| T-006-D04 | S2 / P2 | CA-5 mete el foco con `.focus()`, que también funciona sobre un elemento fuera del orden de tabulación | Entrar con `page.keyboard.press('Tab')`, como quien navega con teclado |
| T-006-D05 | S3 / P2 | `"@playwright/test": "^1.63.0"` — el checklist pide versión fijada | Versión exacta, coherente con el lock |

### Cómo comprobar que cada fix sirve

Para D01 y D03, no alcanza con escribir la prueba: hay que **demostrar que
falla sin el arreglo**, igual que hiciste con CA-8.

- **D01** — rompé el carrusel a propósito (por ejemplo, cambiá el `aria-label`
  del botón siguiente en `CarruselEquipo.tsx`) y mostrá que la suite **falla**
  en vez de omitir. Revertí después.
- **D03** — quitá el efecto de `CarruselEquipo.tsx:119-127` que corta la
  animación al pausar, y mostrá que la prueba nueva **falla**. Revertí después.

Pegá las dos salidas reales en la entrega, en una sección "Sensibilidad de las
pruebas nuevas".

## 7. Notas técnicas

- **Sin esperar 5 segundos reales por paso.** Playwright tiene
  `page.clock` para controlar el tiempo del navegador: instalá el reloj falso
  antes de cargar y avanzalo. Si por algo no sirve acá, decilo en la entrega y
  usá esperas reales con `expect.poll`, pero que la suite no tarde minutos.
- **El sitio necesita `NEXT_PUBLIC_SUPABASE_*`.** El worktree ya tiene
  `.env.local`. El `webServer` de la configuración de Playwright tiene que
  levantar el sitio **compilado** (`npm run build && npm start`), no `next dev`:
  en desarrollo React monta los efectos dos veces y el comportamiento del
  temporizador no es el que ve el visitante.
- **El puerto no puede chocar** con el 3000 ni con el 3014 que puede estar
  ocupado. Elegí uno y dejalo en la configuración.
- **Cómo encontrar el carrusel:** el bloque tiene
  `aria-roledescription="carrusel"`; los controles tienen `aria-label`
  (`Miembro anterior`, `Miembro siguiente`, `Ir a <nombre>`). Usá roles y
  etiquetas, no clases de CSS —son CSS Modules y el nombre cambia en cada
  build—.
- **Los resultados de Playwright** (`test-results/`, `playwright-report/`,
  `blob-report/`) van al `.gitignore`.
- **No fijes la versión del navegador en el repo.** `npx playwright install
  chromium` lo baja donde Playwright lo guarda, fuera del proyecto.

## 8. Definición de hecho

- [ ] Todos los CA cumplidos, cada uno con su test o evidencia
- [ ] CA-8 demostrado con salida real del fallo, y el cambio revertido
- [ ] `npx next typegen && npx tsc --noEmit` limpio
- [ ] `npm run lint` limpio
- [ ] `npm test` verde (y sin haber crecido: la suite nueva no corre ahí)
- [ ] `npm run test:navegador` verde
- [ ] Commits convencionales, archivos stageados por nombre, en la rama correcta
- [ ] Working tree limpio (`git status --short` vacío)
- [ ] `entrega-dev.md` escrita en esta carpeta y commiteada
- [ ] Sin push, sin PR, sin `db push`

---

## Formato de `entrega-dev.md`

Escribirla en `docs/pm/tareas/T-006/entrega-dev.md`. Es lo único que el PM y
QA van a leer de tu trabajo además del diff: sé preciso, sin marketing.

```markdown
# Entrega T-006 — ronda 1

**Estado:** LISTA PARA QA | BLOQUEADA

## Qué hice
- <cambio> — `archivo:línea`

## Trazabilidad
| CA | Cómo se cumple | Test / evidencia |
| -- | -------------- | ---------------- |

## CA-8 — la prueba falla sin el fix
<qué cambiaste, salida real del fallo, y confirmación de que lo revertiste>

## Commits
<salida de `git log --oneline <base>..HEAD`>

## Verificación (salida real, recortada)
<tsc, lint, npm test y npm run test:navegador — las últimas líneas con los totales>

## Cuánto tarda la suite
<tiempo real de `npm run test:navegador`>

## Migraciones
Ninguna.

## Decisiones tomadas
- <decisión> — porque <razón>; alternativa descartada: <...>

## Fuera de alcance que vi (no tocado)
- <hallazgo> — `archivo:línea`

## Preguntas / bloqueos
- <si Estado = BLOQUEADA: qué necesitás decidido para seguir>
```
