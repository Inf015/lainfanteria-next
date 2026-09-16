# Validar T-003 — récords en el sitio (5 min)

```bash
cd /Users/oliverinfante/orca/workspaces/lainfanteria-next/lainfanteria-next-records-sitio
set -a; source /private/tmp/claude-501/-Users-oliverinfante-orca-workspaces-lainfanteria-next-hippocamp/c344ea39-f52e-43cc-9a51-5bd9d8bac39a/scratchpad/sb-gate/local-dev.env; set +a
npm run dev -- -p 3013
```

Los datos de prueba ya están cargados en la base local (miembros `t003-`).

| # | Dónde | Qué tenés que ver |
| - | ----- | ----------------- |
| 1 | http://localhost:3013/equipo | **Miembro A** con distintivo «🏁 3 RÉCORDS NACIONALES»; **B** y **C** sin distintivo; **D** con «🏁 RÉCORD NACIONAL» |
| 2 | Perfil del **Miembro A** | Cifra «3 · Récords nacionales» arriba, y bloque **Récords** entre Biografía y Galería de trofeos |
| 3 | Fichas del bloque | «9.874 s @ 142.5 mph» (en una línea, como pediste), etiqueta RÉCORD NACIONAL, disciplina, auto·lugar, fecha y «Ver fuente ↗» |
| 4 | Hitos | El de alcance nacional dice RÉCORD NACIONAL; el que no suma dice **HITO**; el texto largo no se corta |
| 5 | Abajo del bloque | **Historial** con los superados marcados SUPERADO |
| 6 | Perfil del **Miembro C** | Sin bloque Récords: la página queda como antes |
| 7 | Achicá la ventana a ancho de celular | Todo en una columna, sin scroll horizontal |

Si algo no coincide, decímelo con el paso y lo que viste.
