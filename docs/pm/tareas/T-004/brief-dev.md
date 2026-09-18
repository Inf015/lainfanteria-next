# T-004 — Récords del equipo: panel y «Sobre nosotros»

| Campo | Valor |
| ----- | ----- |
| Rama | `oliver132123/records-equipo` |
| Worktree | `/Users/oliverinfante/orca/workspaces/lainfanteria-next/lainfanteria-next-records-equipo` |
| Base | `origin/main` |
| Tipo | feat |
| Migración | No |
| Ronda | 1 |

> **Prioridad baja.** Arranca cuando T-001, T-002 y T-003 estén mergeadas **y**
> exista el primer récord del equipo para cargar. Hoy no hay ninguno (Oliver,
> 2026-09-15): construir la pantalla antes es construir algo que nadie ve.

**Antes de empezar leé `docs/pm/contexto.md` entero** y después
`docs/pm/backlog/EPICA-records.md`. Sus reglas ganan sobre este brief.

## 1. Por qué

Además de los récords de cada piloto, habrá récords de La Infantería como equipo
o taller. La base ya los admite desde T-001 (`records.miembro_id` nulo, visibles
para `anon`). Falta poder cargarlos desde el panel y mostrarlos en
**«Sobre nosotros»**, que es donde el sitio presenta al equipo.

## 2. Alcance

**Dentro:**
- `getRecordsEquipo()` en `lib/datos.ts`
- Panel: botón **«Récords del equipo»** en la cabecera de la página de miembros, que abre el `RecordsModal` de T-002 sin miembro
- `/nosotros`: bloque **«Récords del equipo»** con el componente `Records` de T-003

**Fuera (no tocar aunque parezca relacionado):**
- La migración (ya está en 0013)
- `lib/records.ts` y `lib/records-form.ts` (ya aceptan `miembroId: null`). Si hace falta cambiarlos, **escalá**
- Rediseño de `/nosotros`, del modal o del componente `Records`
- Mostrar los récords del equipo en `/equipo` o en la home

## 3. Archivos probables

- `lib/datos.ts`
- `app/(admin)/(panel)/admin/miembros/page.tsx` — segunda consulta: `records` con `.is('miembro_id', null)`
- `app/(admin)/(panel)/admin/miembros/MiembrosAdmin.tsx` — botón y estado
- `app/(admin)/(panel)/admin/miembros/RecordsModal.tsx` — aceptar `miembro: Miembro | null`
- `app/(sitio)/nosotros/page.tsx`
- `app/(sitio)/nosotros/nosotros.module.css` (solo si hace falta)
- `tests/unidad/…` si agregás lógica pura

## 4. Criterios de aceptación

- **CA-1** — `getRecordsEquipo(): Promise<RecordDeportivo[]>` devuelve los récords con `miembro_id` nulo (`.is('miembro_id', null)`, **no** `.eq(…, null)`, que en PostgREST no matchea nada), pasados por `ordenarRecords`, con `consultar()` y respaldo `[]`.
- **CA-2** — En el panel, «Récords del equipo» abre el modal titulado «Récords del equipo» con esos récords; alta, edición, superado y borrado funcionan igual que en T-002 e insertan con `miembro_id: null`.
- **CA-3** — Un récord cargado en el modal del equipo **no** aparece en el de ningún miembro, y viceversa; abrir el del equipo después del de un miembro no arrastra datos del miembro.
- **CA-4** — En `/nosotros`, el bloque «Récords del equipo» va **después de la sección de números** (`nosotrosNumeros`) y antes de «Valores», con el componente `Records` de T-003.
- **CA-5** — Sin récords del equipo, `/nosotros` queda **idéntica** a la de hoy.
- **CA-6** — Si `getRecordsEquipo` falla, `/nosotros` se sigue viendo entera sin el bloque (y la consulta corre en paralelo con `getAjustes`).
- **CA-7** — Con la sección `nosotros` apagada, sigue devolviendo 404.
- **CA-8** — A 400 px, sin scroll horizontal; sin errores de hidratación.

## 5. Pruebas requeridas

- [ ] Unidad: las que correspondan si agregás lógica pura.
- [ ] Seguridad: nada nuevo (T-001 ya cubre `records`).
- [ ] Humo: nada nuevo.
- [ ] **Verificación manual y visual** en local (`npx supabase start`, requiere Docker): cargar desde el panel un récord del equipo con cifras y un hito; verlos en `/nosotros`; confirmar que no aparecen en ningún miembro; y `/nosotros` sin récords del equipo. Evidencia en la entrega.

## 6. Defectos a corregir (solo rondas de fix)

No aplica en ronda 1.

## 7. Definición de hecho

- [ ] Todos los CA cumplidos, cada uno con su test o evidencia
- [ ] `npx next typegen && npx tsc --noEmit` limpio
- [ ] `npm run lint` limpio
- [ ] `npm test` verde
- [ ] `npm run build` pasa
- [ ] Commits convencionales, archivos stageados por nombre, en la rama correcta
- [ ] Working tree limpio
- [ ] `entrega-dev.md` escrita en esta carpeta y commiteada
- [ ] Sin push, sin PR, sin `db push`
