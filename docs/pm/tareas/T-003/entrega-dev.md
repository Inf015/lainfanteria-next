# Entrega T-003 — ronda 1

**Estado:** LISTA PARA QA

## Qué hice

- Componente `Records` (Server Component), reutilizable para T-004: `app/(sitio)/_componentes/Records.tsx`
- Su CSS, siguiendo el lenguaje visual de `miembro.module.css`/`equipo.module.css`: `app/(sitio)/_componentes/records.module.css`
- Funciones puras de texto (fuera de `lib/records.ts`, como pide el brief): `app/(sitio)/_componentes/records-texto.ts` — `textoDistintivoNacional`, `lineaHistorial`
- Bloque «Récords» entre «Biografía» y «Galería de trofeos», y cifra «Récord nacional»/«Récords nacionales» en la cabecera: `app/(sitio)/equipo/[slug]/page.tsx:8-9,61,70,162`
- Distintivo RÉCORD NACIONAL en la tarjeta de `/equipo`: `app/(sitio)/equipo/MiembroCard.tsx:8-9,36,64-68`, `app/(sitio)/equipo/equipo.module.css` (clase `.distintivoRecord`)

No tocado: `lib/records.ts`, `lib/types.ts`, `lib/datos.ts`, nada de `app/(admin)/`, `miembro.module.css` (no hizo falta para la cifra: reusa `.cifra`/`.cifraValor`/`.cifraEtiqueta` existentes).

## Trazabilidad

| CA | Cómo se cumple | Test / evidencia |
| -- | -------------- | ---------------- |
| CA-1 | `FichaRecord` en `Records.tsx`: tiempo como principal, velocidad chica debajo con `@ ` solo si hay las dos; con una sola cifra, esa es la principal; etiqueta, disciplina+categoría, auto·lugar, fecha, fuente | Verificación visual (miembro A, ficha 1 y 2) — ver abajo |
| CA-2 | Rama `!conCifras`: `record.titulo` como `<p className={s.hito}>`, categoría aparte si hay; misma etiqueta/meta/fecha/fuente | Verificación visual (miembro A, ficha 3 con hito de 239 car., y ficha 4 sin alcance) |
| CA-3 | `.grilla { grid-template-columns: repeat(auto-fill, minmax(240px,1fr)) }`, sin `align-items` propio → stretch por defecto iguala alturas por fila; 1 columna a 768px | Revisión de código; **no pude confirmar en pantalla** (ver "Bloqueos" abajo) |
| CA-4 | `superados = records.filter(!vigente)`; `lineaHistorial` en `records-texto.ts` arma `[formatearMarca(r), r.titulo, fechaLogro(r)].filter(Boolean).join(' · ')`, nunca deja `·` colgando | `tests/unidad/records-texto.test.ts` › `lineaHistorial` (4 casos) + verificación visual (miembro A: `"6.500 s · t003-1/8 de milla · 2019"` y `"t003-Récord de la pista local (superado)"`) |
| CA-5 | `FUENTE_PERMITIDA = /^https?:\/\//i`, `fuenteValida` antes de renderizar el `<a>`, con `target="_blank" rel="noopener noreferrer"` | Revisión de código (`Records.tsx:14,73,96-105`); la base ya lo restringe (`records_fuente_url_http`) así que no hay forma de insertar un caso `javascript:` de prueba |
| CA-6 | `Records` devuelve `null` con `records.length === 0` | Miembro C (sin récords): `grep -c "records-module" miembro-c.html` → `0` |
| CA-7 | `<Records .../>` insertado entre el bloque Biografía y el de Galería de trofeos en `page.tsx:162` | Lectura de código + verificación visual (miembro A) |
| CA-8 | `cifras` en `page.tsx:70` agrega `{ valor: nacionales, etiqueta: ... }` justo después de Trofeos, antes de Campeonatos | Miembro A (3): `cifraEtiqueta: "Récords nacionales"`, `cifraValor: 3`. Miembro D (1): `cifraEtiqueta: "Récord nacional"`, `cifraValor: 1` |
| CA-9 | No se tocó `seccionActiva('equipo')` ni el `notFound()` de la página | No se probó activamente (no toqué la tabla `secciones`, compartida con T-002 en el mismo Supabase local); el código que lo garantiza no se modificó |
| CA-10 | `nacionales = recordsNacionalesVigentes(miembro.records).length`; badge con `textoDistintivoNacional` | Miembro A (3): HTML `"🏁 3 RÉCORDS NACIONALES"` con `aria-hidden="true"` en el emoji. Miembro D (1): `"🏁 RÉCORD NACIONAL"` |
| CA-11 | Badge condicionado a `nacionales > 0` | Miembro B (solo pista + hito sin alcance) y C (sin récords): sin `distintivoRecord` en su tarjeta (confirmado por proximidad de texto en el HTML) |
| CA-12 | `overflow-wrap: break-word` en marca/hito/disciplina/meta/fecha/historialTexto; `.historialTexto` con `min-width:0` (flex); grilla a 1 columna en mobile | Revisión de código; **no pude confirmar en pantalla a 400 px** (ver "Bloqueos") |
| CA-13 | `Records` es Server Component puro, sin `Date.now()` ni zona horaria del navegador; `fechaLogro` usa solo año/mes enteros | Revisión de código; sin cambios en componentes cliente existentes más allá de una condición determinística (`nacionales > 0`) en `MiembroCard` |
| CA-14 | Bloque `<h2>` (`Récords`, igual que `Biografía`); subtítulo `<h3>` (`Historial`), sin saltar niveles | Revisión de código + payload SSR: `"h2"` con `"Récords"`, `"h3"` con `"Historial"` |

## Commits

```
d9eb8d4 feat(equipo): distintivo RÉCORD NACIONAL en la tarjeta del equipo
b22a7e8 feat(equipo): bloque Récords y cifra de récords nacionales en /equipo/<slug>
d301290 test(equipo): pruebas unitarias de records-texto
9a19ad5 feat(equipo): componente Records reutilizable (fichas vigentes + historial)
```

(`git log --oneline oliver132123/records-schema..HEAD` también lista `db9e1b4 docs(pm): brief T-003 ...`, que ya estaba en la rama antes de empezar.)

## Verificación (salida real)

```
$ npx next typegen
✓ Types generated successfully

$ npx tsc --noEmit
(sin salida — limpio)

$ npm run lint
> eslint
(sin salida — limpio)

$ npm test
 Test Files  8 passed (8)
      Tests  135 passed (135)

$ npm run build
✓ Compiled successfully in 2.7s
  Running TypeScript ...
  Finished TypeScript in 2.3s ...
[supabase] "miembros activos" falló: {
  code: 'PGRST200',
  message: "Could not find a relationship between 'miembros' and 'records' in the schema cache"
}
✓ Generating static pages using 7 workers (13/13) in 675ms
exit code: 0
```

El error de `[supabase]` es el esperado por el brief: `.env.local` apunta a producción, donde la migración 0013 (`records`) todavía no está aplicada. `getMiembros()` cae a su respaldo `[]` (patrón ya existente en `lib/datos.ts`) y el build igual termina en verde (13/13 páginas, exit 0). No lo "arreglé": es el orden de deploy documentado en `EPICA-records.md`.

## Migraciones

Ninguna (T-003 no lleva migración; ya la trajo T-001).

## Verificación visual (Supabase local compartido, sección 5 del brief)

Levanté `npm run dev -- -p 3003` con `local-dev.env` cargado (`set -a; source .../local-dev.env; set +a`), contra el `supabase_db_lainfanteria-next` local ya corriendo (no ejecuté `start/stop/reset/db push`, solo `insert`).

### SQL de datos de prueba (todo con prefijo `t003-` en `slug`/`titulo`, solo `insert`)

```sql
insert into miembros (nombre, slug, roles, biografia, activo, orden) values
  ('t003- Miembro A', 't003-miembro-a', '{Piloto}', 'Piloto de prueba T-003, con récords nacionales.', true, 900),
  ('t003- Miembro B', 't003-miembro-b', '{Piloto}', 'Piloto de prueba T-003, solo récord de pista.', true, 901),
  ('t003- Miembro C', 't003-miembro-c', '{Piloto}', 'Piloto de prueba T-003, sin récords.', true, 902),
  ('t003- Miembro D', 't003-miembro-d', '{Piloto}', 'Piloto de prueba T-003, un solo récord nacional.', true, 903);

-- Miembro A: nacional (tiempo+velocidad+fuente), nacional (solo velocidad km/h),
-- hito nacional (~239 car.), hito sin alcance, superado con cifras, hito superado.
insert into records (miembro_id, titulo, categoria, tiempo_s, velocidad, unidad_velocidad, alcance, auto, lugar, anio, mes, vigente, fuente_url)
select id, 't003-1/4 de milla', 'Pro Modified', 9.874, 142.5, 'mph', 'nacional', 't003-Auto A', 't003-Autódromo', 2024, 5, true, 'https://example.com/t003-fuente-a'
from miembros where slug = 't003-miembro-a';

insert into records (miembro_id, titulo, velocidad, unidad_velocidad, alcance, anio, vigente)
select id, 't003-Milla estándar', 320.5, 'km_h', 'nacional', 2023, true
from miembros where slug = 't003-miembro-a';

insert into records (miembro_id, titulo, alcance, vigente)
select id, 't003-Primer dominicano en ganar cuatro campeonatos consecutivos de drag racing en la categoria Pro Modified, superando ademas el record de asistencia en un evento de aceleracion en toda la historia del deporte motor dominicano y del Caribe', 'nacional', true
from miembros where slug = 't003-miembro-a';

insert into records (miembro_id, titulo, vigente)
select id, 't003-Primer dominicano en correr el Race of Champions', true
from miembros where slug = 't003-miembro-a';

insert into records (miembro_id, titulo, tiempo_s, alcance, lugar, anio, vigente)
select id, 't003-1/8 de milla', 6.5, 'pista', 't003-Pista vieja', 2019, false
from miembros where slug = 't003-miembro-a';

insert into records (miembro_id, titulo, vigente)
select id, 't003-Récord de la pista local (superado)', false
from miembros where slug = 't003-miembro-a';

-- Miembro B: récord de pista vigente con tiempo, hito sin alcance.
insert into records (miembro_id, titulo, tiempo_s, alcance, vigente)
select id, 't003-Standing mile', 22.123, 'pista', true
from miembros where slug = 't003-miembro-b';

insert into records (miembro_id, titulo, vigente)
select id, 't003-Primer podio juvenil', true
from miembros where slug = 't003-miembro-b';

-- Miembro C: sin récords (a propósito).

-- Miembro D: un solo récord nacional vigente (caso singular de CA-8/CA-10).
insert into records (miembro_id, titulo, tiempo_s, alcance, vigente)
select id, 't003-Standing quarter', 10.001, 'nacional', true
from miembros where slug = 't003-miembro-d';
```

### Lo observado (por `curl` contra `localhost:3003`, HTML/payload SSR reales)

- **`/equipo/t003-miembro-a`**: cabecera con cifra `3` / `"Récords nacionales"`. Bloque «Récords» con 4 fichas vigentes: (1) `RÉCORD NACIONAL` · `9.874 s` grande + `@ 142.5 mph` chico debajo · `t003-1/4 de milla · Pro Modified` · `t003-Auto A · t003-Autódromo` · `Mayo 2024` · enlace `Ver fuente ↗`; (2) `RÉCORD NACIONAL` · `320.5 km/h` (una sola cifra) · `t003-Milla estándar` · `2023`; (3) `RÉCORD NACIONAL` · hito de 239 caracteres completo, sin cortar; (4) `HITO` · `t003-Primer dominicano en correr el Race of Champions`. Historial con 2 líneas: `SUPERADO 6.500 s · t003-1/8 de milla · 2019` y `SUPERADO t003-Récord de la pista local (superado)` (sin `·` colgando).
- **`/equipo/t003-miembro-b`**: sin cifra de récords nacionales en la cabecera (0, filtrada). Bloque «Récords» con 2 fichas vigentes: `RÉCORD DE PISTA` (con tiempo) y `HITO`. Sin historial (ningún superado).
- **`/equipo/t003-miembro-c`**: sin bloque «Récords» en absoluto (`0` clases `records-module` en el HTML) — página idéntica a la de antes.
- **`/equipo/t003-miembro-d`**: cifra `1` / `"Récord nacional"` (singular).
- **`/equipo`** (grilla): tarjeta de A con distintivo `🏁 3 RÉCORDS NACIONALES` (emoji `aria-hidden`); tarjeta de D con `🏁 RÉCORD NACIONAL` (singular, sin número); tarjetas de B y C sin distintivo.
- Sin errores de compilación ni 5xx en el log del server (`dev-3003.log`): todas las rutas devolvieron `200`.

### Bloqueos de esta verificación

No pude tomar capturas de pantalla reales (desktop y 400 px) porque el navegador embebido de Orca (`mcp__MCP_DOCKER__browser_*`) forzó todas las requests de recursos a HTTPS (`net::ERR_SSL_PROTOCOL_ERROR`, el server local no tiene TLS) y luego la sesión del navegador se cayó (`connection closed: client is closing: EOF`) sin recuperarse tras varios reintentos — es una falla de la herramienta, no del entorno local (que sí levantó y sirvió contenido correcto por `curl` en todo momento). Por eso **no marco CA-3 y CA-12 como verificados visualmente**: están cubiertos por revisión de código (grid con `auto-fill`/`minmax`, `overflow-wrap: break-word`, 1 columna a 768px) y por el contenido HTML real confirmado arriba, pero pido a QA que confirme con una captura real a 400 px, sobre todo la ficha 1 de miembro A (cifra larga) y la ficha 3 (hito largo).

Dejé el servidor de dev detenido al terminar, pero **no borré los datos de prueba** (miembros/records con prefijo `t003-`) para que el PM y QA los usen.

## Decisiones tomadas

- Creé `app/(sitio)/_componentes/records-texto.ts` (no estaba en la lista de "archivos probables" del brief) porque la sección 5 pide explícitamente extraer a un `.ts` de `_componentes` el texto pluralizado del distintivo y la línea del historial, con test — es justamente eso.
- El distintivo de la tarjeta va como badge en la esquina opuesta al número de carrera (`top-left`, mismo tratamiento visual que `.pilotNumber`), no como rediseño: reusa el mismo lenguaje (fondo `--color-primary`, `font-display`, mayúsculas) en una posición libre.
- Para hitos con `categoria`, la muestro en su propia línea (`.disciplina`) separada del título/frase del hito, porque el título de un hito es la frase completa y no admite el patrón `título · categoría` de CA-1 sin quedar raro.
- `superados` se calcula con `records.filter(r => !r.vigente)` en vez de una función de `lib/records.ts` nueva, porque ya existe `recordsVigentes` y su complemento es trivial — no ameritaba tocar `lib/records.ts` (prohibido) ni duplicar lógica.

## Fuera de alcance que vi (no tocado)

- Ninguno nuevo. Los ya anotados en `EPICA-records.md` (RLS de `logros` sin test) no son de esta tarea.

## Preguntas / bloqueos

- Ninguno que bloquee la entrega. Sí dejo pendiente para QA la confirmación visual real (capturas) de CA-3 y CA-12 a 400 px, por la falla de la herramienta de navegador descrita arriba.
