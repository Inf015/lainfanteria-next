# T-003 — Récords en el sitio: página del piloto, tarjeta y equipo

| Campo | Valor |
| ----- | ----- |
| Rama | `oliver132123/records-sitio` |
| Worktree | `<ruta absoluta>` |
| Base | `oliver132123/records-schema` |
| Tipo | feat |
| Migración | No |
| Ronda | 1 |

**Antes de empezar leé `docs/pm/contexto.md` entero** y después
`docs/pm/backlog/EPICA-records.md`. Sus reglas ganan sobre este brief.

## 1. Por qué

El equipo tiene récords nacionales y hitos («primer dominicano en…») y hoy no se
ven en ningún lado. Son lo más impresionante del palmarés: una **marca** tiene que
leerse de un vistazo por su cifra, un **hito** por su frase. Hay récords de cada
piloto y récords del equipo como tal.

## 2. Alcance

**Dentro:**
- Componente compartido de récords (fichas vigentes + historial)
- Bloque **«Récords»** en `/equipo/<slug>`, entre «Biografía» y «Galería de trofeos»
- Cifra «Récords nacionales» en la cabecera de la ficha del miembro
- Distintivo **RÉCORD NACIONAL** en la tarjeta de `/equipo`
- Bloque **«Récords del equipo»** en `/equipo`, arriba de la grilla de miembros
- CSS de todo lo anterior, mobile incluido

**Fuera (no tocar aunque parezca relacionado):**
- `lib/records.ts`, `lib/types.ts`, `lib/datos.ts` — son de T-001. Si te falta algo, **escalá**
- Cualquier archivo de `app/(admin)/` — es T-002, que corre **en paralelo**
- Home, página `/records`, `/nosotros`, metadata/Open Graph, `GaleriaTrofeos.tsx`
- Rediseñar la tarjeta, la ficha o la página del equipo más allá de lo pedido

## 3. Archivos probables

- `app/(sitio)/equipo/_componentes/Records.tsx` (nuevo, **Server Component**: no necesita estado) — lo usan las dos páginas
- `app/(sitio)/equipo/_componentes/records.module.css` (nuevo)
- `app/(sitio)/equipo/[slug]/page.tsx`
- `app/(sitio)/equipo/[slug]/miembro.module.css` (solo si hace falta para la cifra)
- `app/(sitio)/equipo/page.tsx`
- `app/(sitio)/equipo/equipo.module.css`
- `app/(sitio)/equipo/MiembroCard.tsx`

Leé la guía de Next 16 en `node_modules/next/dist/docs/` antes de tocar las
páginas. Seguí el lenguaje visual existente de `miembro.module.css` y
`equipo.module.css` (títulos de bloque, cifras, tipografía): lo nuevo tiene que
parecer de la misma página.

## 4. Criterios de aceptación

Usá lo de T-001: `esMarca`, `formatearMarca`, `NOMBRE_ALCANCE`, `recordsVigentes`,
`recordsNacionalesVigentes`, `getRecordsEquipo()`, y `fechaLogro` de
`lib/palmares.ts`. `miembro.records` y `getRecordsEquipo()` ya vienen ordenados.

### Componente `Records`

Recibe una lista de récords y el título del bloque. Si la lista está vacía, no
renderiza nada (`null`).

- **CA-1** — Ficha de una **marca** vigente:
  - la cifra (`formatearMarca`) como elemento principal, la más grande del bloque
  - etiqueta con `NOMBRE_ALCANCE` en mayúsculas (p. ej. «RÉCORD NACIONAL»)
  - el título (la disciplina), y ` · categoría` si hay
  - `auto · lugar` con lo que haya (si no hay ninguno, la línea no aparece)
  - la fecha (`fechaLogro`) si hay
  - «Ver fuente ↗» si hay `fuente_url`
- **CA-2** — Ficha de un **hito** vigente: sin cifra; el **título es el elemento principal**, en tipografía destacada (más chica que la cifra de una marca, más grande que el texto normal), que no se corta aunque ocupe tres líneas. Misma etiqueta de alcance, categoría, lugar, fecha y fuente que una marca. Sin línea de auto.
- **CA-3** — Las fichas vigentes se acomodan en una grilla (una columna en mobile, varias en desktop); marcas e hitos mezclados en el orden recibido, con altura pareja por fila.
- **CA-4** — Los superados van **debajo**, bajo el subtítulo «Historial», una línea cada uno con la marca **SUPERADO**: `cifra · título · fecha` en marcas, `título · fecha` en hitos. Si solo hay superados, se muestra solo el historial. Nunca queda un separador ` · ` colgando.
- **CA-5** — Defensa en profundidad: el enlace de fuente solo se renderiza si `fuente_url` empieza con `http://` o `https://`, aunque la base ya lo restrinja, con `target="_blank"` y `rel="noopener noreferrer"`. Nunca un `href` con `javascript:`.

### Página del piloto (`/equipo/<slug>`)

- **CA-6** — Dado un miembro sin récords, entonces la página queda **idéntica** a la de hoy (ni título, ni contenedor vacío, ni un `0` suelto).
- **CA-7** — Dado un miembro con récords, entonces el bloque «Récords» aparece entre «Biografía» y «Galería de trofeos».
- **CA-8** — En la cabecera, `cifras` gana `{ valor: recordsNacionalesVigentes(miembro.records).length, etiqueta }`, con etiqueta «Récord nacional» si es 1 y «Récords nacionales» si son más, **después de** «Trofeos». Cuenta marcas e hitos. Con 0 no aparece (el filtro existente ya lo hace).
- **CA-9** — Con la sección `equipo` apagada, `/equipo/<slug>` sigue devolviendo 404.

### Tarjeta del equipo

- **CA-10** — Dado un miembro con al menos un récord nacional **vigente** (marca o hito), entonces la tarjeta muestra el distintivo con el texto «RÉCORD NACIONAL» (texto real; si llevás emoji, con `aria-hidden="true"`). Con 2 o más: «2 RÉCORDS NACIONALES».
- **CA-11** — Dado un miembro sin récords nacionales vigentes (ninguno, solo superados, o solo de pista/evento), entonces la tarjeta queda idéntica a la de hoy.

### Página del equipo (`/equipo`)

- **CA-12** — Dados récords del equipo, entonces arriba de la grilla de miembros aparece el bloque «Récords del equipo» con el mismo componente. Sin récords del equipo, la página queda **idéntica** a la de hoy.
- **CA-13** — La consulta de los récords del equipo no demora ni rompe la de miembros: si una falla, la otra sigue mostrándose (las dos pasan por `consultar()`, que ya devuelve `[]` ante error; lanzalas en paralelo con `Promise.all`).

### Diseño

- **CA-14** — A **400 px** de ancho, nada genera scroll horizontal; una cifra larga (`'10.000 s'`, `'241.5 mph'`) y un hito largo (200 caracteres) no se cortan ni se salen de su ficha.
- **CA-15** — Sin errores de hidratación en la consola (nada depende de `Date.now()` ni de la zona horaria del navegador).
- **CA-16** — Jerarquía de títulos correcta: el bloque es `h2` como «Biografía»; nada salta niveles.

## 5. Pruebas requeridas

- [ ] Unidad: si extraés lógica propia (p. ej. el texto pluralizado del distintivo o la línea del historial), va en una función pura en un `.ts` de `app/(sitio)/equipo/_componentes/`, con test en `tests/unidad/`. **No** agregues lógica en `lib/records.ts`.
- [ ] Seguridad: nada nuevo.
- [ ] Humo: nada nuevo (las rutas ya existen y la prueba de humo corre contra producción, sin récords cargados aún).
- [ ] **Verificación visual** (evidencia en la entrega): con `npx supabase start` en tu worktree (requiere Docker), `npm run dev` apuntando a la base local, y estos datos en la base **local**:
  - miembro A: 1 marca nacional vigente en segundos con fuente, 1 marca nacional vigente en km/h, 1 hito nacional vigente de ~200 caracteres, 1 marca superada, 1 hito superado
  - miembro B: solo 1 marca de pista vigente
  - miembro C: sin récords
  - equipo: 1 marca vigente y 1 hito vigente

  Comprobá CA-1 a CA-16 en desktop y a 400 px, y también `/equipo` **sin**
  récords del equipo. Pegá en la entrega el SQL que usaste y lo que se ve en cada
  caso. Si no pudiste levantar el entorno local, decilo y **no** marques los CA
  visuales como cumplidos.

## 6. Defectos a corregir (solo rondas de fix)

No aplica en ronda 1.

## 7. Definición de hecho

- [ ] Todos los CA cumplidos, cada uno con su test o evidencia
- [ ] `npx next typegen && npx tsc --noEmit` limpio
- [ ] `npm run lint` limpio
- [ ] `npm test` verde
- [ ] `npm run build` pasa (las páginas son estáticas: `generateStaticParams`)
- [ ] Commits convencionales (`feat(equipo): …`), archivos stageados por nombre, en la rama correcta
- [ ] Working tree limpio
- [ ] `entrega-dev.md` escrita en esta carpeta y commiteada
- [ ] Sin push, sin PR, sin `db push`, sin tocar `app/(admin)/` ni `lib/records.ts`
