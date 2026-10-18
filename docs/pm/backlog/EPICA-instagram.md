# Épica — Autos desde Instagram

> Pedido de Oliver (2026-10-18): «que el módulo de venta de vehículos tome
> automáticamente los posts de vehículos de IG, solo en espera de autorización».
>
> Aclaraciones del mismo día:
> - La cuenta es **@lainfanteria_autosales**, propia de Oliver y dedicada a la
>   venta, sin carreras.
> - Se prefiere **sin costo**: nada de IA paga. Los datos se pre-llenan con un
>   **lector de reglas**.

## Qué se construye

```
 @lainfanteria_autosales      Vercel Cron (1×/día) o «Buscar ahora»      Supabase
 ───────────────────────      ─────────────────────────────────────      ────────
 post nuevo ── Graph API ───► lee los posts nuevos ──────────────► autos_importados (pendiente)
                              baja las fotos ────────────────────► bucket fotos/instagram/<id>/
                              lee el texto (reglas) ─────────────► sugerencia: marca, modelo, precio…
                                                                           │
 Panel /admin/autos ◄──────────────────────────────────────────────────────┘
   «Pendientes de Instagram»: fotos, texto, link al post, formulario pre-llenado
   ├─ Aprobar   ──► RPC atómico: crea el auto + sus fotos (una principal) → publicado
   └─ Descartar ──► libera las fotos; el post no vuelve a importarse
```

## Costo: USD 0

| Pieza | Costo |
| ----- | ----- |
| Graph API de Instagram (leer tu propia cuenta) | Gratis |
| Vercel Cron en plan Hobby | Gratis, **máximo 1 corrida por día** (se suma el botón «Buscar ahora») |
| Supabase Storage (fotos) | Gratis dentro de 1 GB |
| Lector de reglas | Gratis: código propio, sin IA |

## Decisiones tomadas (Oliver, 2026-10-18)

1. **Todo post de la cuenta entra a «Pendientes».** No hay filtro por hashtag.
   Lo que no sea un auto (furgones, promos) se descarta con un clic.
   **Los reels y videos se ignoran:** no se importan, y de un carrusel mixto se
   toman solo las fotos.
2. **Nada se publica sin aprobación**, y antes de aprobar se puede **editar
   todo**: datos, fotos (quitar, reordenar, elegir la principal, agregar las
   tuyas) y estado.
3. **Pre-llenado con reglas, no con IA.** Si un dato no aparece, el campo queda
   vacío; nunca se inventa. Si algún día se queda corto, se le agrega IA encima.

## Decisiones de PM (cuestionables — decirlo antes de lanzar T-009)

| Decisión | Por qué | Alternativa descartada |
| -------- | ------- | ---------------------- |
| **Tabla aparte `autos_importados`**, no filas en `autos` | `autos` exige marca, modelo y precio (`not null`). Un post no siempre los trae, y un borrador en `autos` está a un `activo = true` de salir en el sitio | Relajar las restricciones de `autos` y usar un estado «borrador» |
| **Solo posts posteriores a la conexión**; backfill opcional con una fecha «importar desde» | Los autos ya publicados en IG probablemente ya estén cargados a mano: importarlos los duplicaría | Importar todo el historial de entrada |
| **Aprobar = publicar** (`activo = true`) | Es el objetivo del flujo; el admin ya revisó y completó los datos | Aprobar a oculto y publicar en un segundo paso |
| **El token de IG vive en la base** (`instagram_conexion`, sin acceso para `anon`/`authenticated`) y se renueva solo antes de vencer | El token dura 60 días: en una variable de entorno habría que renovarlo a mano cada dos meses | Variable de entorno en Vercel |
| **Primer uso de la service role key en la app**, solo en el servidor (`import 'server-only'`) | El cron corre sin un admin logueado: no hay otra credencial que pueda escribir | Un RPC llamado con la anon key: abriría la escritura a cualquiera que conozca la ruta |
| **Aprobar por RPC `security definer`**, no desde el navegador en varios pasos | Auto + fotos + estado en una sola transacción; mismo invariante que la foto principal (0012) | Tres `insert`/`update` desde el cliente |
| **Cron diario** (`0 12 * * *` UTC = 8:00 en RD) | El plan Hobby de Vercel no permite más; para autos en venta alcanza | Cada hora: exige Vercel Pro (USD 20/mes) |

## Tareas

```
  T-008 (staging) ──► T-009  instagram-importar     migración 0014, cron, lector de reglas
                         │   (sola: lleva migración)
                         ▼
                      T-010  instagram-panel         migración 0015 (RPC), pendientes,
                             (sola: lleva migración) aprobar/descartar, conectar, «Buscar ahora»
```

| ID | Rama | Migración | Carril | Archivos |
| -- | ---- | --------- | ------ | -------- |
| T-009 | `oliver132123/instagram-importar` | **0014** | Estricto | `supabase/migrations/0014_*.sql`, `lib/instagram/*`, `lib/supabase/servicio.ts`, `app/api/cron/instagram/route.ts`, `vercel.ts`, `middleware.ts` (si hace falta), `lib/types.ts`, `tests/unidad/instagram-*.test.ts`, `tests/seguridad/rls.test.ts` |
| T-010 | `oliver132123/instagram-panel` | **0015** | Estricto | `supabase/migrations/0015_*.sql`, `app/(admin)/(panel)/admin/autos/*`, `tests/unidad/…`, `tests/seguridad/rls.test.ts` |

**Por qué dos tareas:** entera era demasiado para un solo brief. T-009 deja los
pendientes cargándose solos y T-010 los vuelve revisables. Se pueden probar por
separado: T-009 contra staging con un token cargado por SQL.

## Pasos de Oliver (antes de T-009)

1. **Cuenta profesional.** En IG: perfil → ☰ → *Configuración y actividad* →
   *Tipo de cuenta y herramientas*. Si dice «Cambiar a cuenta personal», ya lo
   es. Si no: *Empresa* → categoría *Concesionario de autos*.
2. **App de Meta.** En developers.facebook.com: *Crear app* → caso de uso
   *Administrar mensajes y contenido en Instagram* (API de Instagram con
   inicio de sesión de Instagram) → *Configuración de la API* → agregar la
   cuenta `lainfanteria_autosales` → **Generar token**. Para leer tu propia
   cuenta no hace falta pasar la revisión de Meta. Permiso:
   `instagram_business_basic`.
3. **Guardar el token.** Nunca en el chat ni en el repo. En T-010 se pega en el
   panel («Conectar Instagram»). Mientras tanto, para probar T-009 en staging,
   el PM lo carga por SQL desde tu máquina.

## ⚠️ Orden de deploy (NO-GO si se invierte)

1. Migración **0014** aplicada en staging (`npm run staging:migrar`), probada.
2. Oliver: `npx supabase db push` en prod (0014).
3. Variables en Vercel. **Production** con las claves de prod y **Preview** con
   las de staging:
   - `SUPABASE_SERVICE_ROLE_KEY` (**sin** `NEXT_PUBLIC_`)
   - `CRON_SECRET`
4. Merge de T-009. El cron no hace nada hasta que exista una conexión: sin fila
   en `instagram_conexion`, responde «sin conexión» y termina.
5. Igual para T-010 con la **0015**.

> Los crons de Vercel corren **solo en el deployment de producción**. En
> staging (preview) la ruta se prueba llamándola a mano con el `CRON_SECRET`.
