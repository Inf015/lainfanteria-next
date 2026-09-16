# Validar T-002 — récords en el panel (10 min)

Levantá el panel contra la base local (no toca producción):

```bash
cd /Users/oliverinfante/orca/workspaces/lainfanteria-next/lainfanteria-next-records-panel
set -a; source /private/tmp/claude-501/-Users-oliverinfante-orca-workspaces-lainfanteria-next-hippocamp/c344ea39-f52e-43cc-9a51-5bd9d8bac39a/scratchpad/sb-gate/local-dev.env; set +a
npm run dev -- -p 3012        # el 3000 lo ocupa otro proyecto
```

Entrá a http://localhost:3012/admin/login con **admin2@local.test / solo-local-123**, y andá a **Equipo**. Usá el miembro **«T002 Piloto Prueba»** (los `t003-` son de la otra tarea).

| # | Qué hacer | Qué tenés que ver |
| - | --------- | ----------------- |
| 1 | Botón **Récords** en la fila del miembro (la tabla scrollea a la derecha) | Modal con sus récords: los vigentes primero, y píldora **SUMA** solo en los nacionales vigentes |
| 2 | **+ Agregar récord** → título, tiempo 9.874, velocidad 142.5 mph, alcance **Nacional** → Agregar | Se cierra el formulario y aparece en la lista como «9.874 s» |
| 3 | Agregar otro **sin tiempo ni velocidad** (un hito), alcance **Ninguno — no suma** | Aparece sin cifra, sin SUMA, y la columna Marca queda vacía |
| 4 | Agregar uno **sin elegir alcance** | Mensaje en rojo visible: «Elegí el alcance…», y no se guarda |
| 5 | Poner año **1949** y guardar | Mensaje en español: «El año tiene que estar entre 1950 y 2100.» |
| 6 | **Marcar superado** y después **Marcar vigente** | Cambia el estado, se reordena y la píldora SUMA aparece/desaparece |
| 7 | **Editar** el hito del paso 3 | El alcance abre en «Ninguno — no suma» (no en blanco) |
| 8 | **Borrar** uno | Pide confirmación con el título y desaparece de la lista |
| 9 | Cerrar el modal, abrirlo en **otro miembro** | Solo ves los récords de ese miembro |

Si algo no coincide, decímelo con el paso y lo que viste.

Lo que ya está verificado automáticamente (no hace falta que lo repitas): 194 pruebas, tipos, lint, build, y las carreras de respuestas lentas (ver `pruebas-pm-r3.txt`).
