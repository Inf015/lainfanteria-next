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
