# T-003 — Récords en la página del piloto y en la tarjeta del equipo

| Campo | Valor |
| ----- | ----- |
| Rama | `oliver132123/records-sitio` |
| Worktree | `/Users/oliverinfante/orca/workspaces/lainfanteria-next/lainfanteria-next-records-sitio` |
| Base | `oliver132123/records-schema` |
| Tipo | feat |
| Migración | No |
| Ronda | 1 |

**Antes de empezar leé `docs/pm/contexto.md` entero** y después
`docs/pm/backlog/EPICA-records.md`. Sus reglas ganan sobre este brief.

## 1. Por qué

El equipo tiene pilotos con récords nacionales y hitos («primer dominicano en…»)
y hoy no se ven en ningún lado. Son lo más impresionante del palmarés: una marca
tiene que leerse de un vistazo por su cifra (**9.874 s @ 142.5 mph**), un hito por
su frase, y la tarjeta del equipo tiene que avisar que ese piloto tiene uno.

## 2. Alcance

**Dentro:**
- Componente de récords reutilizable (fichas vigentes + historial)
- Bloque **«Récords»** en `/equipo/<slug>`, entre «Biografía» y «Galería de trofeos»
- Cifra «Récords nacionales» en la cabecera de la ficha del miembro
- Distintivo **RÉCORD NACIONAL** en la tarjeta de `/equipo`
- CSS de todo lo anterior, mobile incluido

**Fuera (no tocar aunque parezca relacionado):**
- Récords del equipo y `/nosotros` — es T-004 (reutilizará tu componente, por eso vive en `app/(sitio)/_componentes/`)
- `lib/records.ts`, `lib/types.ts`, `lib/datos.ts` — son de T-001. Si te falta algo, **escalá**
- Cualquier archivo de `app/(admin)/` — es T-002, que corre **en paralelo**
- Home, página `/records`, metadata/Open Graph, `GaleriaTrofeos.tsx`
- Rediseñar la tarjeta o la ficha más allá de lo pedido

## 3. Archivos probables

- `app/(sitio)/_componentes/Records.tsx` (nuevo, **Server Component**: no necesita estado)
- `app/(sitio)/_componentes/records.module.css` (nuevo)
- `app/(sitio)/equipo/[slug]/page.tsx`
- `app/(sitio)/equipo/[slug]/miembro.module.css` (solo si hace falta para la cifra)
- `app/(sitio)/equipo/MiembroCard.tsx`
- `app/(sitio)/equipo/equipo.module.css`

Leé la guía de Next 16 en `node_modules/next/dist/docs/` antes de tocar las
páginas. Seguí el lenguaje visual existente de `miembro.module.css` y
`equipo.module.css` (títulos de bloque, cifras, tipografía): lo nuevo tiene que
parecer de la misma página.

## 4. Criterios de aceptación

Usá lo de T-001: `formatearTiempo`, `formatearVelocidad`, `formatearMarca`,
`tieneCifras`, `etiquetaRecord`, `recordsVigentes`, `recordsNacionalesVigentes`,
y `fechaLogro` de `lib/palmares.ts`. `miembro.records` ya viene ordenado.

### Componente `Records`

Recibe `records: RecordDeportivo[]` y `titulo: string`. Con la lista vacía,
devuelve `null`.

- **CA-1** — Ficha de un récord vigente **con cifras** (`tieneCifras`):
  - con tiempo **y** velocidad: el tiempo (`formatearTiempo`) es el elemento principal, la cifra más grande del bloque, y debajo, más chico, `@ ` + `formatearVelocidad`
  - con una sola cifra: esa es el elemento principal
  - etiqueta `etiquetaRecord` en mayúsculas (p. ej. «RÉCORD NACIONAL», «RÉCORD»)
  - el título (la disciplina), y ` · categoría` si hay
  - `auto · lugar` con lo que haya (si no hay ninguno, la línea no aparece)
  - la fecha (`fechaLogro`) si hay
  - «Ver fuente ↗» si hay `fuente_url`
- **CA-2** — Ficha de un récord vigente **sin cifras** (hito): el **título es el elemento principal**, en tipografía destacada (más chica que una cifra, más grande que el texto normal), que no se corta aunque ocupe tres líneas. Misma etiqueta (`etiquetaRecord`: «RÉCORD NACIONAL» si suma, «HITO» si no tiene alcance), categoría, auto, lugar, fecha y fuente.
- **CA-3** — Las fichas vigentes se acomodan en una grilla (una columna en mobile, varias en desktop), con y sin cifras mezcladas en el orden recibido y altura pareja por fila.
- **CA-4** — Los superados van **debajo**, bajo el subtítulo «Historial», una línea cada uno con la marca **SUPERADO**: `formatearMarca · título · fecha` si hay cifras, `título · fecha` si no. Si solo hay superados, se muestra solo el historial. Nunca queda un separador ` · ` colgando.
- **CA-5** — Defensa en profundidad: el enlace de fuente solo se renderiza si `fuente_url` empieza con `http://` o `https://`, aunque la base ya lo restrinja, con `target="_blank"` y `rel="noopener noreferrer"`. Nunca un `href` con `javascript:`.

### Página del piloto (`/equipo/<slug>`)

- **CA-6** — Dado un miembro sin récords, entonces la página queda **idéntica** a la de hoy (ni título, ni contenedor vacío, ni un `0` suelto).
- **CA-7** — Dado un miembro con récords, entonces el bloque «Récords» aparece entre «Biografía» y «Galería de trofeos».
- **CA-8** — En la cabecera, `cifras` gana `{ valor: recordsNacionalesVigentes(miembro.records).length, etiqueta }`, con etiqueta «Récord nacional» si es 1 y «Récords nacionales» si son más, **después de** «Trofeos». Con 0 no aparece (el filtro existente ya lo hace).
- **CA-9** — Con la sección `equipo` apagada, `/equipo/<slug>` sigue devolviendo 404.

### Tarjeta del equipo

- **CA-10** — Dado un miembro con al menos un récord nacional **vigente** (con o sin cifras), entonces la tarjeta muestra el distintivo con el texto «RÉCORD NACIONAL» (texto real; si llevás emoji, con `aria-hidden="true"`). Con 2 o más: «2 RÉCORDS NACIONALES».
- **CA-11** — Dado un miembro sin récords nacionales vigentes (ninguno, solo superados, solo de pista/evento, o hitos sin alcance), entonces la tarjeta queda idéntica a la de hoy.

### Diseño

- **CA-12** — A **400 px** de ancho, nada genera scroll horizontal; una cifra larga (`'10.000 s'` con `'@ 241.5 mph'`) y un hito de 200 caracteres no se cortan ni se salen de su ficha.
- **CA-13** — Sin errores de hidratación en la consola (nada depende de `Date.now()` ni de la zona horaria del navegador).
- **CA-14** — Jerarquía de títulos correcta: el bloque es `h2` como «Biografía»; nada salta niveles.

## 5. Pruebas requeridas

- [ ] Unidad: si extraés lógica propia (p. ej. el texto pluralizado del distintivo o la línea del historial), va en una función pura en un `.ts` de `app/(sitio)/_componentes/`, con test en `tests/unidad/`. **No** agregues lógica en `lib/records.ts`.
- [ ] Seguridad: nada nuevo.
- [ ] Humo: nada nuevo (la ruta ya existe y la prueba de humo corre contra producción, sin récords cargados aún).
- [ ] **Verificación visual** (evidencia en la entrega): con el **Supabase local compartido** de la sección 8 y `npm run dev -- -p 3003`, y estos datos en la base **local**:
  - miembro A: nacional vigente con tiempo + velocidad + fuente; nacional vigente solo con velocidad en km/h; hito nacional vigente de ~200 caracteres; hito vigente sin alcance; uno superado con cifras; un hito superado
  - miembro B: solo un récord de pista vigente con tiempo, y un hito sin alcance
  - miembro C: sin récords

  Comprobá CA-1 a CA-14 en desktop y a 400 px (A debe mostrar «3 RÉCORDS NACIONALES» en su tarjeta; B, ningún distintivo). Pegá en la entrega el SQL que usaste y lo que se ve en cada caso. Si no pudiste levantar el entorno local, decilo y **no** marques los CA visuales como cumplidos.

## 6. Defectos a corregir (solo rondas de fix)

No aplica en ronda 1.

## 7. Definición de hecho

- [ ] Todos los CA cumplidos, cada uno con su test o evidencia
- [ ] `npx next typegen && npx tsc --noEmit` limpio
- [ ] `npm run lint` limpio
- [ ] `npm test` verde
- [ ] `npm run build` pasa (la página es estática: `generateStaticParams`)
- [ ] Commits convencionales (`feat(equipo): …`), archivos stageados por nombre, en la rama correcta
- [ ] Working tree limpio
- [ ] `entrega-dev.md` escrita en esta carpeta y commiteada
- [ ] Sin push, sin PR, sin `db push`, sin tocar `app/(admin)/` ni `lib/records.ts`

## 8. Entorno local compartido (lo provee el PM — gana sobre cualquier otra instrucción de entorno)

T-002 y T-003 corren **en paralelo** contra **una sola** instancia de Supabase
local, que ya está levantada con las migraciones 0001–0013 de esta épica.

- **Prohibido** `npx supabase start`, `stop`, `db reset`, `db push` o cualquier `drop`/`truncate`: reiniciarla borra el trabajo del otro dev.
- Variables y usuarios de prueba: `/private/tmp/claude-501/-Users-oliverinfante-orca-workspaces-lainfanteria-next-hippocamp/c344ea39-f52e-43cc-9a51-5bd9d8bac39a/scratchpad/sb-gate/local-dev.env` (no lo copies al repo ni lo commitees). Levantá el sitio así:
  ```bash
  set -a; source /private/tmp/claude-501/-Users-oliverinfante-orca-workspaces-lainfanteria-next-hippocamp/c344ea39-f52e-43cc-9a51-5bd9d8bac39a/scratchpad/sb-gate/local-dev.env; set +a
  npm run dev -- -p 3003      # el 3000 lo ocupa otro proyecto
  ```
  Las variables del shell ganan sobre `.env.local`, que apunta a producción: **nunca** corras `npm run dev` sin cargar ese archivo antes.
- Datos de prueba: todo lo que crees (miembros, slugs, récords) con el prefijo **`t003-`** en `slug` y `titulo`, para no chocar con el otro dev. Si cargás por SQL: `docker exec -i supabase_db_lainfanteria-next psql -U postgres -d postgres` y **solo `insert`/`update`/`delete` de filas con tu prefijo**.
- Al terminar no borres tus datos: el PM y QA los usan para verificar.
