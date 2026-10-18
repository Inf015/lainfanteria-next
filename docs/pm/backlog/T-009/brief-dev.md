# T-009 — Importar los posts de Instagram como autos pendientes

| Campo | Valor |
| ----- | ----- |
| Rama | `oliver132123/instagram-importar` |
| Worktree | `<ruta absoluta>` |
| Base | `origin/main` |
| Tipo | feat |
| Migración | **Sí** — `0014_autos_importados.sql` |
| Ronda | 1 |

> Arranca cuando **T-008 esté mergeada** (staging disponible para probar
> escrituras) y Oliver haya hecho los pasos de `EPICA-instagram.md`.

**Antes de empezar leé `docs/pm/contexto.md` entero** y después
`docs/pm/backlog/EPICA-instagram.md`. Sus reglas ganan sobre este brief.

## 1. Por qué

Los autos en venta se publican primero en @lainfanteria_autosales y después se
cargan a mano en el panel, dos veces el mismo trabajo. Esta tarea deja los
posts nuevos **cargándose solos** como pendientes, con fotos y datos
pre-llenados. Nada se publica: revisar y aprobar es T-010.

## 2. Alcance

**Dentro:**
- **Migración 0014:**
  - Tabla `autos_importados`, con el enum `estado_importado`.
  - Tabla `instagram_conexion`.
  - RLS, políticas y grants de las dos (§4).
- **Cliente de servicio** `lib/supabase/servicio.ts`: service role, con
  `import 'server-only'`, variable `SUPABASE_SERVICE_ROLE_KEY`.
- **Lector de reglas** `lib/instagram/lector.ts`: función pura, caption →
  sugerencia (§5).
- **Importador** `lib/instagram/importar.ts`, más el cliente Graph:
  - lee los posts nuevos;
  - baja las fotos al bucket;
  - aplica el lector;
  - inserta los pendientes;
  - renueva el token.
- **Ruta del cron** `app/api/cron/instagram/route.ts`, protegida con
  `CRON_SECRET`.
- **Cron diario** en `vercel.ts` (`0 12 * * *`). Si `@vercel/config` complica,
  `vercel.json`, justificado.
- Tipos en `lib/types.ts`.
- **Doc:**
  - `contexto.md`: invariante nuevo de la service role en el servidor;
    tablas nuevas.
  - `.env.example`: nombres de las variables nuevas.

**Fuera (no tocar aunque parezca relacionado):**
- Cualquier pantalla del panel: pendientes, aprobar, descartar, conectar y
  «Buscar ahora» son T-010.
- La tabla `autos` y el sitio público.
- IA de cualquier tipo.
- Webhooks de Meta (no avisan posts nuevos del feed).
- Videos y reels en cualquier forma: Oliver pidió ignorarlos.

## 3. Archivos probables

- `supabase/migrations/0014_autos_importados.sql`
- `lib/supabase/servicio.ts`
- `lib/instagram/{lector,graph,importar}.ts`
- `app/api/cron/instagram/route.ts`
- `vercel.ts` (o `vercel.json`), `package.json`
- `middleware.ts`, solo si intercepta `/api/cron`
- `lib/types.ts`
- `tests/unidad/instagram-lector.test.ts`, `tests/unidad/instagram-importar.test.ts`
- `tests/seguridad/rls.test.ts`
- `docs/pm/contexto.md`, `.env.example`

## 4. Base de datos (0014)

```
autos_importados
  id            bigint identity PK
  ig_media_id   text NOT NULL UNIQUE      ← dedupe: un post se importa una sola vez, aunque se descarte
  permalink     text NOT NULL             ← check: empieza con https://www.instagram.com/
  tipo_media    text NOT NULL             ← IMAGE | CAROUSEL_ALBUM (los VIDEO no se importan)
  publicado_en  timestamptz NOT NULL
  caption       text NOT NULL DEFAULT ''
  fotos         text[] NOT NULL DEFAULT '{}'   ← URLs públicas de NUESTRO bucket, nunca de cdninstagram
  sugerencia    jsonb NOT NULL DEFAULT '{}'    ← salida del lector
  estado        estado_importado NOT NULL DEFAULT 'pendiente'   (pendiente | aprobado | descartado)
  auto_id       bigint NULL REFERENCES autos(id) ON DELETE SET NULL
  creado_en     timestamptz NOT NULL DEFAULT now()
  revisado_en   timestamptz NULL

instagram_conexion   (una sola fila)
  id              smallint PK DEFAULT 1 CHECK (id = 1)
  access_token    text NOT NULL
  expira_en       timestamptz NOT NULL
  token_renovado_en timestamptz NOT NULL   ← última vez que se obtuvo/renovó el token
  importar_desde  timestamptz NOT NULL   ← solo se importan posts con timestamp >= esto
  ultima_corrida  timestamptz NULL
  ultimo_error    text NULL
```

- `autos_importados`:
  - RLS activo.
  - `select` y `update` solo si `es_admin()`, igual que `autos` en 0006.
  - Sin políticas de `insert` ni `delete` para `authenticated`: inserta solo
    el importador, con service role.
  - Grants: `select, update` a `authenticated`. Nada a `anon`.
- `instagram_conexion`:
  - RLS activo, **sin ninguna política**.
  - `revoke all … from anon, authenticated`: el token no lo ve nadie más que la
    service role.
- **Seguridad**, agregar a `tests/seguridad`. Todos `42501`:
  - `anon` no lee ni escribe `autos_importados`;
  - `anon` no lee `instagram_conexion`.

## 5. Lector de reglas

`leerCaption(caption: string): Sugerencia`. Pura, sin red. Devuelve
`{ marca, modelo, version, anio, motor, kilometraje, precio, moneda,
descripcion, titulo }`. Cada campo es `string | null` (`precio`:
`number | null`; `moneda`: `'USD' | 'DOP' | null`).

**Regla de oro: si no está, `null`. Nunca inventar.**

Caso real (fixture obligatorio, **literal**, con sus emojis):

```
🔥 EN VENTA – Ford Mustang GT Performance Pack 🔥

🚀 Motor V8 – Potencia y adrenalina americana
🏎️ Performance Pack – Deportividad y rendimiento superior
🐎 Diseño agresivo y el rugido inconfundible de un Mustang GT
💰 Precio: USD$ 35,900

Un verdadero muscle car que combina potencia, estilo y una experiencia de conducción emocionante. ¡Un Mustang diseñado para quienes buscan algo más que un simple automóvil! 🔥

📍 Disponible en La Infantería AutoSales
📞 809-883-6884
```

Resultado esperado:

| Campo | Valor |
| ----- | ----- |
| `titulo` | `Ford Mustang GT Performance Pack` |
| `marca` | `Ford` |
| `modelo` | `Mustang` |
| `version` | `GT Performance Pack` |
| `motor` | `V8` |
| `precio` | `35900` |
| `moneda` | `USD` |
| `anio` | `null` |
| `kilometraje` | `null` |
| `descripcion` | el párrafo «Un verdadero muscle car…», sin la línea del teléfono ni la de «📍 Disponible en» |

Reglas:

| Campo | Regla |
| ----- | ----- |
| `titulo` | lo que sigue a `EN VENTA` (con `–`, `-` o `:`) hasta el fin de línea, sin emojis. Si no hay `EN VENTA`, la primera línea con texto |
| `marca` | primera palabra (o dos: `Land Rover`, `Mercedes-Benz`, `Alfa Romeo`) del título que esté en una **lista fija de marcas**, sin distinguir mayúsculas. Si no está en la lista: `marca`, `modelo` y `version` en `null`, y el título queda en `titulo` |
| `modelo` | la palabra siguiente a la marca |
| `version` | el resto del título, sin el año si lo trae; `null` si queda vacío |
| `anio` | `Año: 2019` en cualquier línea, o un año suelto entre 1950 y el año actual + 1 en el título |
| `kilometraje` | `Millaje`/`Kilometraje`/`Km`/`Millas` + número, o número + `km`/`mi`/`millas`. Se guarda como texto normalizado: `45,000 mi`, `80,000 km` |
| `precio` / `moneda` | `Precio` + `USD$`/`US$`/`USD`/`$` → USD; `RD$`/`DOP` → DOP; luego el número. Acepta `35,900`, `35.900`, `1,250,000`. Sin moneda explícita: `moneda` en `null`. Un número que no se puede leer sin ambigüedad: `precio` en `null` |
| `motor` | `Motor` + lo que sigue hasta `–`, `-`, `,` o el fin de línea |
| `descripcion` | párrafos que no fueron consumidos como campo, sin líneas de teléfono, `📍`, `Disponible en` ni hashtags. `null` si no queda nada |

Casos de prueba mínimos, además del real:
- precio en `RD$ 1,250,000`;
- `US$35.900`;
- sin precio;
- año en el título (`Toyota Tacoma TRD 2019`);
- `📅 Año: 2019` y `🛣️ Millaje: 45,000 mi`;
- `80,000 km`;
- marca que no está en la lista;
- caption vacío;
- `Mercedes-Benz C300`;
- un post que no es un auto (`Furgones de carga disponibles…`), que debe dar casi todo `null` sin romperse.

## 6. Importador

`importar({ db, ahora }): Resumen`, llamado desde la ruta del cron. T-010 lo
reusa en «Buscar ahora».

1. Lee `instagram_conexion`. **Sin fila:** devuelve `{ estado: 'sin_conexion' }`
   y no hace nada más.
2. **Renovación del token:** si `token_renovado_en < ahora − 7 días`, llama a
   `GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=…`
   y guarda el token nuevo, `expira_en = ahora + expires_in` y
   `token_renovado_en = ahora`. Si falla, sigue con el actual y lo anota en
   `ultimo_error`.

   **Por qué cada 7 días y no «cerca del vencimiento»:** un token pegado a mano
   no trae su fecha de emisión, así que `expira_en` puede estar mal al
   principio. Renovar cada semana lo deja siempre a 60 días, sea cual sea el
   valor inicial. Meta exige que el token tenga al menos 24 h, y 7 días lo
   cumple.
3. Llama a
   `GET https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_type,media_url,thumbnail_url}`.
   Pagina hasta encontrar posts con `timestamp < importar_desde`, o hasta 100
   posts revisados.
4. **Reels y videos se ignoran (Oliver, 2026-10-18).** Un post `VIDEO` no se
   importa ni cuenta para ningún tope. Tampoco un carrusel sin ninguna imagen.
   Descarta los `id` que ya existan en `autos_importados`, en cualquier
   estado. Procesa los nuevos del más viejo al más nuevo, **máximo 10 por
   corrida**.
5. **Fotos de cada post** (máximo 10):
   - `IMAGE` → `media_url`.
   - `CAROUSEL_ALBUM` → solo los hijos `IMAGE` (`media_url`). Los hijos `VIDEO`
     se saltean: ni el video ni su miniatura.

   Cada foto se descarga, se valida (`content-type` `image/*`, ≤ 10 MB) y se
   sube al bucket `fotos` en `instagram/<ig_media_id>/<n>.<ext>`. Las URLs de
   cdninstagram **caducan**: no se guardan nunca.
6. Inserta la fila `pendiente` con `sugerencia = leerCaption(caption)`, usando
   `on conflict (ig_media_id) do nothing`. **Si el insert falla o no inserta,
   borra del bucket lo que subió para ese post.**
7. **Un post que falla** (descarga o subida) no frena a los demás. No se
   inserta, se reintenta en la próxima corrida y queda en el resumen.
8. Actualiza `ultima_corrida` y `ultimo_error` (nulo si todo salió bien).
   Devuelve `{ estado, nuevos, ya_importados, fallidos: [{ ig_media_id, motivo }] }`.
   **Nunca** pone el token en logs, respuestas ni mensajes de error.

**Ruta** `GET /api/cron/instagram`:
- Exige `Authorization: Bearer <CRON_SECRET>`, comparado en tiempo constante.
  Sin header, header incorrecto o `CRON_SECRET` sin definir → `401`, sin
  ejecutar nada.
- Corre en el runtime de Node (el default).
- Devuelve el resumen como JSON.
- Si el middleware del panel intercepta `/api/*`, excluí esta ruta sin abrir
  nada más.

## 7. Criterios de aceptación

- **CA-1 — Lector.** El caso real de §5 da exactamente la tabla esperada, y
  cada caso mínimo de §5 da su resultado. Ningún campo se rellena con un valor
  que no esté en el texto.
- **CA-2 — Importa.** Con una conexión válida en staging, una corrida deja una
  fila `pendiente` por cada post nuevo posterior a `importar_desde`, con:
  `ig_media_id`, `permalink`, `tipo_media`, `publicado_en`, `caption`,
  `sugerencia`, y `fotos` apuntando al bucket de staging (cada una responde
  200).
- **CA-3 — Dedupe.** Una segunda corrida sin posts nuevos no inserta nada ni
  sube fotos. Un post `descartado` o `aprobado` no se vuelve a importar.
- **CA-4 — Tipos de post.**
  - Una imagen da 1 foto.
  - Un carrusel mixto da solo sus imágenes, sin miniaturas de video.
  - Un reel o video **no crea ninguna fila**, y tampoco un carrusel que sea
    solo de videos.
  - Un carrusel con 12 imágenes guarda 10.
- **CA-5 — Fallas parciales.** Si la foto 2 de un post falla, ese post no se
  inserta, sus fotos ya subidas se borran del bucket, los demás posts se
  importan, y el resumen lo informa.
- **CA-6 — Token.** Se renueva cuando pasaron 7 días o más desde
  `token_renovado_en`, y no antes (valor límite: 7 días − 1 min no renueva; 7
  días sí). Si
  la renovación falla, la importación sigue y `ultimo_error` lo dice. El token
  no aparece en ninguna salida.
- **CA-7 — Sin conexión.** Sin fila en `instagram_conexion`, la ruta responde
  `200 { estado: 'sin_conexion' }` y no llama a Instagram.
- **CA-8 — Cron protegido.** Sin `CRON_SECRET` correcto, la ruta responde
  `401` y no ejecuta nada. También responde `401` si la variable no está
  definida en el servidor.
- **CA-9 — RLS.** `anon` recibe `42501` al leer o escribir `autos_importados`
  y al leer `instagram_conexion`. `authenticated` no-admin no lee
  `instagram_conexion`. El sitio público no muestra nada nuevo.
- **CA-10 — Service role contenida.** `SUPABASE_SERVICE_ROLE_KEY` solo aparece
  en `lib/supabase/servicio.ts`, que tiene `import 'server-only'`. Ningún
  Client Component la importa. No existe `NEXT_PUBLIC_SUPABASE_SERVICE…` en
  ningún lado.
- **CA-11 — Cron.** `vercel.ts` (o `vercel.json`) programa
  `/api/cron/instagram` a las `0 12 * * *`.

## 8. Pruebas requeridas

- [ ] **Unidad — lector:** todos los casos de §5, en una tabla de casos.
- [ ] **Unidad — importador:** con `fetch` mockeado (Graph de Instagram y
  descargas de cdninstagram; está permitido porque es red externa). Cubre la
  selección de fotos por tipo, el tope de 10, el corte por `importar_desde`,
  la renovación del token (límite de 7 días), que el token no aparezca en el
  resumen y el `401` de la ruta. **La base y el bucket no se mockean.**
- [ ] **Contra staging** (escrituras reales, nunca prod): CA-2, CA-3, CA-5 y
  CA-7. Dejá en la entrega los comandos exactos. Los corre el PM, con un token
  real cargado por SQL; vos no tocás `.env*`.
- [ ] **Seguridad:** CA-9 en `tests/seguridad/rls.test.ts`.

## 9. Defectos a corregir (solo rondas de fix)

No aplica en ronda 1.

## 10. Definición de hecho

- [ ] Todos los CA cumplidos, cada uno con su test o evidencia. Los de staging,
  marcados para el PM con su comando.
- [ ] `npx next typegen && npx tsc --noEmit` limpio
- [ ] `npm run lint` limpio
- [ ] `npm test` verde
- [ ] `npm run build` pasa
- [ ] Commits convencionales, archivos stageados por nombre, en la rama correcta
- [ ] Working tree limpio
- [ ] `entrega-dev.md` escrita en esta carpeta y commiteada, con
  **`REQUIERE db push` (0014)** en *Migraciones*
- [ ] Sin push, sin PR, sin `db push`
