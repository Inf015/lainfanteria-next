# T-003 — Récords en la página del piloto y en la tarjeta del equipo

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

El equipo tiene pilotos con récords nacionales y hoy no se ven en ningún lado.
Son lo más impresionante del palmarés y lo primero que alguien quiere ver: la
cifra tiene que leerse de un vistazo, en la página del piloto, y la tarjeta del
equipo tiene que avisar que ese piloto tiene uno.

## 2. Alcance

**Dentro:**
- Bloque **«Récords»** en `/equipo/<slug>`, entre «Biografía» y «Galería de trofeos»
- Cifra «Récords nacionales» en la cabecera de la ficha
- Distintivo **RÉCORD NACIONAL** en la tarjeta de `/equipo`
- CSS de todo lo anterior, mobile incluido

**Fuera (no tocar aunque parezca relacionado):**
- `lib/records.ts`, `lib/types.ts`, `lib/datos.ts` — son de T-001. Si te falta algo, **escalá**
- Cualquier archivo de `app/(admin)/` — es T-002, que corre **en paralelo**
- Home, página `/records`, metadata/Open Graph, `GaleriaTrofeos.tsx`
- Rediseñar la tarjeta o la ficha más allá de lo pedido

## 3. Archivos probables

- `app/(sitio)/equipo/[slug]/page.tsx`
- `app/(sitio)/equipo/[slug]/Records.tsx` (nuevo, **Server Component**: no necesita estado)
- `app/(sitio)/equipo/[slug]/miembro.module.css`
- `app/(sitio)/equipo/MiembroCard.tsx`
- `app/(sitio)/equipo/equipo.module.css`

Leé la guía de Next 16 en `node_modules/next/dist/docs/` antes de tocar la página.
Seguí el lenguaje visual existente de `miembro.module.css` (títulos de bloque,
cifras, tipografía): el bloque nuevo tiene que parecer de la misma página.

## 4. Criterios de aceptación

Usá las funciones de `lib/records.ts` (T-001): `formatearMarca`, `NOMBRE_ALCANCE`,
`recordsVigentes`, `recordsNacionalesVigentes`, y `fechaLogro` de `lib/palmares.ts`.
`miembro.records` ya viene ordenado.

### Página del piloto

- **CA-1** — Dado un miembro sin récords, entonces el bloque «Récords» **no** se renderiza (ni el título) y la página queda idéntica a la de hoy.
- **CA-2** — Dado un miembro con récords vigentes, entonces cada uno se muestra como una ficha con:
  - la **marca** (`formatearMarca`) como elemento principal, visualmente la cifra más grande del bloque
  - una etiqueta con `NOMBRE_ALCANCE` en mayúsculas (p. ej. «RÉCORD NACIONAL»)
  - disciplina, y ` · categoría` si hay
  - `auto · lugar` con lo que haya (si no hay ninguno, la línea no aparece)
  - la fecha (`fechaLogro`) si hay
  - «Ver fuente ↗» si hay `fuente_url`, con `target="_blank"` y `rel="noopener noreferrer"`
- **CA-3** — Dado un miembro con récords superados, entonces aparecen **debajo** de los vigentes, bajo el subtítulo «Historial», en formato compacto (una línea: marca · disciplina · fecha) y con la marca **SUPERADO**. Si solo tiene superados, el bloque se muestra igual, con solo el historial.
- **CA-4** — Defensa en profundidad: el enlace de fuente solo se renderiza si `fuente_url` empieza con `http://` o `https://`, aunque la base ya lo restrinja. Nunca se renderiza un `href` con `javascript:`.
- **CA-5** — En la cabecera, `cifras` gana `{ valor: recordsNacionalesVigentes(miembro.records).length, etiqueta: 'Récords nacionales' }` (en singular «Récord nacional» si es 1), **después de** «Trofeos». Con 0 no aparece (el filtro existente ya lo hace).
- **CA-6** — Con la sección `equipo` apagada, `/equipo/<slug>` sigue devolviendo 404 (no se rompe lo existente).

### Tarjeta del equipo

- **CA-7** — Dado un miembro con al menos un récord nacional **vigente**, entonces la tarjeta muestra el distintivo con el texto «RÉCORD NACIONAL» (texto real, no solo un ícono; si llevás emoji, con `aria-hidden="true"`). Con 2 o más: «2 RÉCORDS NACIONALES».
- **CA-8** — Dado un miembro sin récords nacionales vigentes (ninguno, solo superados, o solo de pista/evento), entonces la tarjeta queda idéntica a la de hoy.

### Diseño

- **CA-9** — A **400 px** de ancho, ni el bloque ni la tarjeta generan scroll horizontal; una marca larga (`'10.000 s'`, `'241.5 mph'`) no se corta ni se sale de su ficha.
- **CA-10** — Las fichas de récords vigentes se acomodan en grilla: una columna en mobile, varias en desktop.
- **CA-11** — Sin errores de hidratación en la consola (nada del bloque depende de `Date.now()` ni de la zona horaria del navegador).

## 5. Pruebas requeridas

- [ ] Unidad: si extraés lógica propia (p. ej. el texto pluralizado del distintivo), va en una función pura exportada desde el componente o un archivo `.ts` de la carpeta, con test en `tests/unidad/`. **No** agregues lógica en `lib/records.ts`.
- [ ] Seguridad: nada nuevo.
- [ ] Humo: nada nuevo (la ruta ya existe y la prueba de humo corre contra producción, sin récords cargados aún).
- [ ] **Verificación visual** (evidencia en la entrega): con `npx supabase start` en tu worktree (requiere Docker), `npm run dev` apuntando a la base local, y estos datos cargados en la base **local**:
  - miembro A: 2 récords nacionales vigentes (uno en segundos, uno en km/h, uno con fuente) + 1 superado
  - miembro B: solo 1 récord de pista vigente
  - miembro C: sin récords

  Comprobá CA-1 a CA-10 en desktop y a 400 px. Pegá en la entrega el SQL que usaste
  y, para cada miembro, lo que se ve. Si no pudiste levantar el entorno local,
  decilo y **no** marques CA visuales como cumplidos.

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
