# Contexto para agentes — La Infantería Motorsport

> Leer **entero** antes de tocar código. Si algo de acá contradice al brief,
> gana esto y se escala al PM. La doc narrativa para humanos está en Obsidian
> (`Oliver/La Infantería/`); este archivo solo tiene lo que un agente necesita
> para no romper nada.

## Qué es

Sitio público + panel `/admin` de un taller y equipo de competición en
República Dominicana. **Next.js 16** (App Router, React 19, TypeScript) +
**Supabase** (Postgres con RLS, Auth, Storage). CSS Modules, sin framework de
UI. Deploy en **Vercel**. Todo el texto de la UI está en español.

```
app/(sitio)/   público, estático-revalidado (revalidate = 60)
app/(admin)/   panel: (acceso)/admin/login | (panel)/admin/* protegido
components/    Navbar, Footer
lib/           supabase/{servidor,navegador}.ts, datos.ts, formato.ts, csp.ts, types.ts ...
supabase/migrations/   00NN_descripcion.sql, numeradas
tests/{unidad,seguridad,humo}/
```

## Reglas duras

1. **Trabajás solo dentro del worktree que te asignaron.** Antes de cada commit:
   `git branch --show-current` tiene que ser la rama del brief. Si no, pará.
2. **Nunca** `git add -A` / `git add .` → stagear archivos por nombre.
3. **Nunca** `git push`, `gh pr create`, `git push --force`, `git reset --hard`,
   ni `git stash` sin mensaje (el stash se comparte entre worktrees).
4. **Nunca** `npx supabase db push` ni ejecutar SQL contra el Supabase remoto.
   Las migraciones se escriben; las aplica Oliver.
5. **Nunca** leer, crear ni modificar `.env*` con valores reales, ni poner
   secretos en código. La service role key **salta RLS**: jamás con prefijo
   `NEXT_PUBLIC_`, jamás en un Client Component.
6. **Solo lo pedido.** Nada de refactors, renombres ni “ya que estaba”. Si ves
   un problema fuera de alcance, anotalo en la entrega como hallazgo.
7. **Commits convencionales en español**: `feat|fix|test|refactor|docs|chore(área): descripción`.
   Áreas usadas: `equipo`, `autos`, `merch`, `noticias`, `videos`, `home`,
   `admin`, `auth`, `storage`, `formato`, `seguridad`, `db`, `ci`.
8. **Push a `main` despliega a producción** (Vercel). Por eso nada llega a
   `main` sin gate + QA + Oliver.

## Next.js 16 — no es el que conocés

- Antes de usar cualquier API de Next, leé la guía correspondiente en
  `node_modules/next/dist/docs/`. Hay cambios incompatibles con lo que viste en
  entrenamiento; respetá los avisos de deprecación.
- `LayoutProps` / `PageProps` son tipos globales generados:
  `npx next typegen` **antes** de `npx tsc --noEmit`.
- Un worktree nuevo no tiene `node_modules`: `npm ci` primero.

## Invariantes del dominio

| Invariante | Dónde | Qué implica para vos |
| ---------- | ----- | -------------------- |
| **La base manda.** RLS activo en todas las tablas; `anon` solo lee lo publicado; escritura solo si `es_admin()` | `supabase/migrations/0006_*` | Tabla nueva ⇒ RLS + políticas + grants en la misma migración, y tests en `tests/seguridad` |
| **Secciones prendibles.** `secciones.activa` apaga navbar, página (404) y bloque de la home | `lib/datos.ts` → `seccionActiva()` | Página pública nueva ⇒ `if (!(await seccionActiva('x'))) notFound();` |
| **Revalidación 60 s** en el sitio público | `app/layout.tsx` | No usar `cache: 'no-store'` en el sitio público sin justificarlo |
| **CSP con nonce** en el panel | `middleware.ts`, `lib/csp.ts` | Host externo nuevo (imágenes, scripts, iframes) ⇒ agregarlo en `lib/csp.ts` y en `next.config.ts` si es imagen |
| **Hora dominicana** (`America/Santo_Domingo`) | `lib/formato.ts` | Nunca `toLocaleString` suelto ni `new Date(input)` de un `datetime-local`: usar los helpers |
| **Slugs estables y únicos** | `lib/formato.ts` | Editar no recalcula el slug (rompe URLs indexadas) |
| **Foto principal: exactamente una** por galería | `auto_fotos`, `producto_fotos` | No hacer el swap con dos UPDATE desde el navegador |
| **Fotos en bucket `fotos`**; heredadas en Cloudinary como URL completa | `next.config.ts` | Reemplazar/borrar una foto ⇒ liberar el objeto del bucket |
| **Migraciones solo por CLI**, numeradas y nunca editadas una vez mergeadas | `supabase/migrations/` | Cambio de schema ⇒ archivo nuevo `00NN_`; marcar en la entrega `REQUIERE db push` |

## Pruebas

| Suite | Comando | Contra qué | Quién la corre |
| ----- | ------- | ---------- | -------------- |
| Unidad | `npm test` | Nada (lógica pura, sin red) | Dev siempre; CI en cada push |
| Seguridad | `npm run test:seguridad` | **Supabase de producción** | PM en el gate pre-PR |
| Humo | `npm run test:humo` | Prod, o `SITIO=http://localhost:3000` | PM en el gate pre-PR y tras deploy |

Convenciones (no negociables):

- **Nunca mockear la capa de datos.** Las pruebas de base van contra Postgres
  real. (Cicatriz: mocks verdes, producción rota.) Sí mockear lo externo:
  `fetch` a YouTube, HTTP, red.
- **`tests/seguridad` solo intenta escrituras que deben fallar** — por eso es
  segura contra producción. Una prueba que necesite **escribir de verdad**
  (p. ej. probar un RPC que muta) **no puede ir contra producción**: va contra
  Supabase local (`npx supabase start`, requiere Docker) y el brief tiene que
  decirlo explícitamente.
- Exigir el código **`42501`** (permiso denegado), no “cualquier error”.
  Trampas conocidas: `PATCH` con cuerpo vacío → `204` sin tocar la base;
  `UPDATE` sin `WHERE` → `400` de PostgREST antes de evaluar permisos.
- Todo bug arreglado lleva su test que falla sin el fix.
- Tests nuevos en español, `describe` por función/pantalla, `it` que describe
  el comportamiento (mirar `tests/unidad/formato.test.ts` como referencia).
