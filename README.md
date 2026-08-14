# La Infantería Motorsport

Sitio de La Infantería Motorsport — taller de alto rendimiento y equipo de
competición en República Dominicana.

Next.js 16 (App Router) + TypeScript + Supabase. Migrado desde un proyecto
Blazor Server que sigue disponible como referencia.

## Desarrollo

```bash
npm install
cp .env.example .env.local   # y completar con los valores reales
npm run dev                  # http://localhost:3000
```

## Estructura

```
app/            Páginas (App Router). Cada una con su CSS Module.
components/     Navbar y Footer, usados desde el layout.
lib/            Cliente de Supabase, queries y tipos.
supabase/       Migraciones de base de datos.
public/images/  Imágenes estáticas del sitio.
```

## Base de datos

Las migraciones se aplican con el CLI de Supabase, nunca a mano desde el panel:

```bash
npx supabase db push
```

Ocho tablas: `secciones`, `ajustes`, `pilotos`, `autos`, `auto_fotos`,
`productos`, `producto_fotos`, `noticias`.

RLS está activo en todas. La anon key **solo lee** lo publicado; no puede
escribir nada.

### Secciones

La tabla `secciones` es el interruptor del sitio: cada fila tiene un booleano
`activa`. El navbar solo muestra las activas, las páginas devuelven 404 si la
suya está apagada, y los bloques de la home desaparecen. Se cambia desde el
panel de Supabase sin tocar código ni desplegar.

### Ajustes

`ajustes` guarda el número de WhatsApp y los datos de contacto del footer. Los
campos vacíos simplemente no se muestran.

## Publicar contenido

Todo se carga desde el panel de Supabase, sin código. Los cambios aparecen en
el sitio en menos de un minuto (`revalidate = 60` en `app/layout.tsx`).

Para un auto con fotos:

1. **Storage** → bucket `fotos` → subir las imágenes y copiar sus URLs
2. **Table Editor** → `autos` → nueva fila, anotar el `id`
3. **Table Editor** → `auto_fotos` → una fila por foto, con `auto_id` y `url`.
   Marcar `es_principal` en **una sola** — es la que sale en la tarjeta

## Pruebas

```bash
npm test              # unitarias: rápidas, sin red
npm run test:seguridad # invariantes de RLS contra el Supabase real
npm run test:humo      # sitio desplegado de punta a punta
npm run test:todo      # las tres
```

Las tres suites están separadas a propósito: `npm test` corre en milisegundos y
sirve mientras se programa; las otras dos necesitan red y credenciales.

**`tests/seguridad`** es la más importante. Comprueba que la *base* rechaza, no
que la aplicación se porte bien: aunque el panel tenga un bug, Postgres tiene que
seguir diciendo que no. Solo intenta escrituras que deben fallar, así que es
segura de correr contra producción, y después verifica que los datos no cambiaron.

Dos trampas que estas pruebas ya contemplan, porque hacen que una prueba pase por
el motivo equivocado:

- Un `PATCH` con cuerpo vacío devuelve `204` sin llegar a la base.
- Un `UPDATE` sin `WHERE` devuelve `400` por una protección de PostgREST, antes
  de evaluar permisos.

Por eso las pruebas mandan datos reales, con filtro, y exigen el código `42501`
—permiso denegado— y no un rechazo cualquiera.

**`tests/humo`** corre contra producción por defecto; para apuntar a local:

```bash
SITIO=http://localhost:3000 npm run test:humo
```

## Deploy

Vercel, conectado al repositorio: cada push a `main` despliega solo.

Variables de entorno a cargar en *Project Settings → Environment Variables*:

| Variable | Dónde sale |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |

## Pendiente

- Backoffice: login, CRUDs y subida de fotos desde el sitio
- Páginas públicas de Merch y Noticias (sus secciones están apagadas)
- Datos de contacto reales en `ajustes`
- Portal de pilotos y sistema de resultados, pospuestos del diseño original
