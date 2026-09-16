# T-005 — Carrusel de pilotos en la portada

| Campo | Valor |
| ----- | ----- |
| Rama | `Inf015/oliver132123-carrusel-equipo` |
| Worktree | `/Users/oliverinfante/orca/workspaces/lainfanteria-next/hippocamp` |
| Base | `origin/main` |
| Tipo | feat |
| Migración | No |
| Ronda | 2 — defectos de `reporte-qa-r1.md` |

**Antes de empezar leé `docs/pm/contexto.md` entero.** Sus reglas ganan sobre
este brief.

> **Aviso de proceso.** Esta tarea la implementó el PM, no un dev independiente.
> Se escribió el brief después de implementar, para poder mandarla a QA. QA
> tiene que tratarlo como cualquier otro diff —con más desconfianza, si acaso:
> ya hubo un defecto entregado (ver *Defectos conocidos*) que el proceso normal
> habría atrapado antes.

## 1. Por qué

La portada no muestra al equipo: quien entra tiene que descubrir `/equipo` por
el menú. Los pilotos son lo que distingue a La Infantería —hay récords
nacionales cargados y decenas de trofeos— y no aparecen hasta que alguien
navega a propósito.

## 2. Alcance

**Dentro:**
- Bloque nuevo en la portada, entre **servicios** y **novedades**, con un
  carrusel que rota solo y muestra a los **pilotos**.
- Cada tarjeta: foto, número de carrera, **distintivo de récords nacionales
  vigentes**, nombre, roles, **contador de trofeos** y enlace al perfil.
- Controles: flechas, puntos indicadores y arrastre táctil.

**Fuera (no tocar aunque parezca relacionado):**
- La página `/equipo` y su tarjeta (`MiembroCard`), que ya existen y funcionan.
- El panel de administración y la tabla `records`.
- Socios y técnicos en la portada: van solo en `/equipo`.

## 3. Archivos probables

- `app/(sitio)/_componentes/CarruselEquipo.tsx`
- `app/(sitio)/_componentes/carrusel-equipo.module.css`
- `app/(sitio)/page.tsx`
- `app/(sitio)/home.module.css`
- `lib/carrusel.ts`
- `tests/unidad/carrusel.test.ts`

## 4. Criterios de aceptación

- **CA-1** — Dado el sitio con la sección `equipo` activa y miembros cargados,
  cuando se abre la portada, entonces aparece el bloque **NUESTROS PILOTOS**
  después del bloque de servicios y antes del de novedades.
- **CA-2** — Dado un miembro **sin** el rol `Piloto`, cuando se abre la
  portada, entonces **no** aparece en el carrusel (sí sigue en `/equipo`).
- **CA-3** — Dado un piloto con N récords **nacionales y vigentes** (N ≥ 1),
  cuando se ve su tarjeta, entonces muestra el distintivo con el mismo texto
  que en `/equipo`: `RÉCORD NACIONAL` para N = 1 y `N RÉCORDS NACIONALES` para
  N > 1. Con N = 0 no hay distintivo. Los récords superados o de alcance no
  nacional no cuentan.
- **CA-4** — Dado un piloto con trofeos, cuando se ve su tarjeta, entonces
  muestra `🏆 N trofeos` con el mismo total que `/equipo` (el declarado en el
  panel, o las fichas cargadas si no se declaró); con 0 trofeos la línea no
  aparece (nunca "0 trofeos").
- **CA-5** — Dado el carrusel con más tarjetas de las que entran en pantalla,
  cuando pasan 5 segundos sin que el usuario interactúe, entonces **avanza solo
  una tarjeta**, y al llegar al final vuelve al principio.
- **CA-6** — Dado el carrusel rotando, cuando el puntero entra en el bloque o
  el foco del teclado cae dentro, entonces la rotación se detiene; al salir,
  se reanuda.
- **CA-7** — Dado `prefers-reduced-motion: reduce`, cuando se abre la portada,
  entonces el carrusel **no rota solo** y los saltos por control son
  instantáneos.
- **CA-8** — Dado que todas las tarjetas entran sin desbordar, cuando se abre
  la portada, entonces no hay controles ni rotación.
- **CA-9** — Dada la primera tarjeta, cuando se pulsa `‹`, entonces salta al
  final; dada la última, `›` vuelve al principio.
- **CA-10** — Dada la sección `equipo` apagada, o sin miembros con rol
  `Piloto`, cuando se abre la portada, entonces el bloque no se renderiza y la
  portada no consulta miembros de más.
- **CA-11** — Dado que el carrusel es un componente de cliente, entonces recibe
  un resumen por piloto y **no** el `Miembro` completo (el palmarés no viaja en
  el HTML).

## 5. Pruebas requeridas

- [x] Unidad: `lib/carrusel.ts` — `proximaPosicion` (avance, retroceso, tope
      recortado, vuelta en ambos extremos, lista vacía), `indiceActivo`
      (alineado, a mitad de camino, tope del scroll, lista vacía) y
      `posicionAnimada` (extremos exactos, recorte fuera de 0..1, ida y vuelta).
- [ ] Seguridad: no aplica — no toca RLS, tablas ni RPC.
- [ ] Humo: no aplica — no agrega ruta ni cambia cabeceras.

## 6. Defectos a corregir

**Antes de QA (encontrado por Oliver en su navegador):**

| ID | Sev | Resumen | Esperado |
| -- | --- | ------- | -------- |
| T-005-D00 | S2 | El carrusel no rotaba: `scrollTo({ behavior: 'smooth' })` no arranca la animación cuando el paso lo dispara un temporizador y no un clic | CA-5: avanza solo cada 5 s |

**Ronda 2 — de `reporte-qa-r1.md` (veredicto FAIL):**

| ID | Sev / Pri | Resumen | Esperado |
| -- | --------- | ------- | -------- |
| T-005-D01 | S2 / P1 | Puntero y foco compartían un booleano: salir con el ratón reanudaba la rotación aunque el foco siguiera dentro | CA-6: pausado mientras cualquiera de los dos siga adentro |
| T-005-D02 | S2 / P1 | Pausar limpiaba el intervalo pero el cuadro ya pedido seguía moviendo el scroll | CA-6: al pausar, se detiene también el paso en curso |
| T-005-D03 | S2 / P2 | Con la sección activa se consultaban todos los miembros y se filtraban en memoria | CA-10: no consultar miembros de más |
| T-005-D04 | S3 / P2 | Los últimos puntos apuntaban a una posición inalcanzable y nunca podían quedar activos | Indicadores coherentes con destinos alcanzables |
| T-005-D05 | S3 / P2 | Los puntos median 24 px de ancho, no el objetivo táctil de 44 px que el comentario afirmaba | 44×44 px efectivos |
| T-005-D06 | S3 / P1 | Ninguna prueba fallaba si se revertía el fix de D00 | Prueba que falla sin el fix |

### Cómo se corrigieron

- **D01** — `punteroAdentro` y `focoAdentro` separados; `pausado` es la unión.
  `onBlurCapture` consulta `relatedTarget`: el foco que salta de un enlace a
  otro dentro del carrusel no cuenta como salida.
- **D02** — `animarScroll` devuelve su cancelador; un efecto lo llama cuando el
  carrusel deja de rotar por cualquier motivo (pausa, movimiento reducido, dejó
  de desbordar) y al desmontar.
- **D03** — `getPilotos()` en `lib/datos.ts` filtra por rol en la consulta
  (`contains('roles', ['Piloto'])`).
- **D04** — `paginas()` calcula las paradas **alcanzables** y hay un punto por
  parada, no por tarjeta. La última parada es el tope y se atribuye a la última
  tarjeta, que es la que se ve al llegar.
- **D05** — puntos de 44×44 px; el contenedor permite que bajen de línea antes
  que achicarse.
- **D06** — la animación se extrajo a `animarScroll(aplicar, desde, hasta,
  reloj)` con el reloj inyectado, y se prueba con un reloj falso que comprueba
  que **se escribe la posición en cada cuadro**. Es lo que no pasaba con
  `behavior: 'smooth'`. **Reserva honesta:** esta prueba cubre la mecánica de
  la animación, no el cableado del componente; una regresión que dejara de
  llamar a `animarScroll` solo la atrapa una prueba de navegador, que necesita
  jsdom + testing-library (hoy no están en el proyecto).

## 7. Definición de hecho

- [x] Todos los CA cumplidos, cada uno con su test o evidencia
- [x] `npx next typegen && npx tsc --noEmit` limpio
- [x] `npm run lint` limpio
- [x] `npm test` verde
- [x] Commits convencionales, archivos stageados por nombre, en la rama correcta
- [x] Working tree limpio
- [x] `entrega-dev.md` escrita en esta carpeta y commiteada
- [x] Sin `db push`
