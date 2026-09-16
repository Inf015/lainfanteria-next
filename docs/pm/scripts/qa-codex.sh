#!/usr/bin/env bash
# Corre el gate del PM y, si pasa, lanza a Codex en read-only sobre la tarea.
#
#   docs/pm/scripts/qa-codex.sh <worktree> T-NNN <ronda>
#
# Deja en docs/pm/tareas/T-NNN/:  gate-r<ronda>.txt  y  reporte-qa-r<ronda>.md
#
# Por qué el gate va acá y no dentro de Codex: con -s read-only, vitest falla con
# EPERM (escribe node_modules/.vite-temp), `next typegen` no puede escribir .next/
# y no hay red. Codex recibe la salida del gate como evidencia de ejecución.
set -euo pipefail

[[ $# -eq 3 ]] || { echo "uso: $0 <worktree> T-NNN <ronda>" >&2; exit 2; }
WT=$(cd "$1" && pwd -P); ID=$2; N=$3
[[ $ID =~ ^T-[0-9]{3}$ ]] || { echo "ID inválido: $ID" >&2; exit 2; }
[[ $N =~ ^[1-9][0-9]*$ ]] || { echo "ronda inválida: $N" >&2; exit 2; }

DIR="$WT/docs/pm/tareas/$ID"
BRIEF_DEV="$DIR/brief-dev.md"; BRIEF_QA="$DIR/brief-qa.md"; ENTREGA="$DIR/entrega-dev.md"
GATE="$DIR/gate-r$N.txt"; REPORTE="$DIR/reporte-qa-r$N.md"

for f in "$BRIEF_DEV" "$BRIEF_QA" "$ENTREGA"; do
  [[ -f $f ]] || { echo "falta $f" >&2; exit 1; }
done
[[ ! -e $REPORTE ]] || { echo "ya existe $REPORTE — ¿ronda equivocada?" >&2; exit 1; }
if grep -q 'CA-1\*\* — Dado <estado>' "$BRIEF_DEV"; then
  echo "brief-dev.md tiene los criterios de aceptación sin completar" >&2; exit 1
fi
if grep -q '^\*\*Estado:\*\* BLOQUEADA' "$ENTREGA"; then
  echo "la entrega está BLOQUEADA — resolver la pregunta del dev antes de QA" >&2; exit 1
fi

RAMA=$(sed -n 's/^| Rama | `\(.*\)` |$/\1/p' "$BRIEF_DEV")
BASE=$(sed -n 's/^| Base | `\([^`]*\)`.*$/\1/p' "$BRIEF_DEV")
ACTUAL=$(git -C "$WT" branch --show-current)
[[ -n $RAMA && $ACTUAL == "$RAMA" ]] || { echo "rama actual '$ACTUAL' ≠ brief '$RAMA'" >&2; exit 1; }
[[ -n $BASE ]] || { echo "no pude leer la Base del brief-dev.md" >&2; exit 1; }
# El gate de esta misma ronda se ignora: si un intento anterior se cortó (Codex
# falló o se interrumpió) quedó sin commitear, y se regenera igual.
LIMPIO=(-- . ":(exclude)docs/pm/tareas/$ID/gate-r$N.txt")
if [[ -n $(git -C "$WT" status --porcelain "${LIMPIO[@]}") ]]; then
  echo "el worktree tiene cambios sin commitear — QA revisa lo commiteado:" >&2
  git -C "$WT" status --short "${LIMPIO[@]}" >&2; exit 1
fi
[[ -d $WT/node_modules ]] || { echo "falta node_modules en $WT (npm ci)" >&2; exit 1; }

# --- Gate -------------------------------------------------------------------
{
  echo "# Gate PM — $ID ronda $N"
  echo "fecha : $(date '+%Y-%m-%d %H:%M:%S %z')"
  echo "rama  : $ACTUAL"
  echo "HEAD  : $(git -C "$WT" rev-parse HEAD)"
  echo "base  : $BASE ($(git -C "$WT" rev-parse --short "$BASE"))"
  echo
  echo "## Commits"; git -C "$WT" log --oneline "$BASE..HEAD"
  echo
  echo "## Archivos"; git -C "$WT" diff --stat "$BASE...HEAD"
} > "$GATE"

FALLOS=0
paso() {
  local nombre=$1; shift
  printf '\n## %s\n$ %s\n' "$nombre" "$*" >> "$GATE"
  if (cd "$WT" && "$@") >> "$GATE" 2>&1; then
    echo "→ OK" >> "$GATE"; echo "  ✓ $nombre"
  else
    echo "→ FALLÓ (exit $?)" >> "$GATE"; echo "  ✗ $nombre"; FALLOS=$((FALLOS + 1))
  fi
}
echo "Gate $ID r$N en $WT"
paso "typegen" npx next typegen
paso "tsc"     npx tsc --noEmit
paso "lint"    npm run lint
paso "unidad"  npm test

# Gate y reporte se commitean en la rama de la tarea: el dev de la ronda
# siguiente los necesita y su definición de hecho exige el worktree limpio.
# `next typegen` puede tocar archivos ignorados, nunca versionados, así que
# esto no arrastra nada ajeno.
commitear() {
  git -C "$WT" add -- "$@"
  git -C "$WT" commit --quiet -m "$MENSAJE" -- "$@"
}

if [[ $FALLOS -gt 0 ]]; then
  MENSAJE="docs(pm): gate $ID r$N — falló" commitear "$GATE"
  echo "Gate con $FALLOS fallo(s) — no se lanza QA. Vuelve al dev. Detalle: $GATE" >&2
  exit 1
fi

# --- QA -----------------------------------------------------------------------
LOG="${TMPDIR:-/tmp}/qa-$ID-r$N.log"

# El brief va por stdin (`-`), no como argumento: como argumento queda visible
# en `ps`, puede pasarse de ARG_MAX, y si stdin queda abierto codex se cuelga en
# "Reading additional input from stdin...".
echo "Codex QA (read-only) → $REPORTE   log: $LOG"
if ! sed \
    -e "s|ronda N|ronda $N|g" \
    -e "s|gate-rN|gate-r$N|g" \
    -e "s|reporte-qa-rN|reporte-qa-r$N|g" \
    "$BRIEF_QA" \
  | codex exec -C "$WT" -s read-only -o "$REPORTE" - > "$LOG" 2>&1; then
  echo "codex terminó con error — ver $LOG" >&2; exit 1
fi
[[ -s $REPORTE ]] || { echo "codex no dejó reporte — ver $LOG" >&2; exit 1; }

VEREDICTO=$(sed -n 's/^\*\*Veredicto:\*\* *\([A-Z-]*\).*/\1/p' "$REPORTE" | head -1)
DEFECTOS=$(grep -c "^### $ID-D" "$REPORTE" || true)
MENSAJE="docs(pm): QA $ID r$N — ${VEREDICTO:-SIN VEREDICTO}" commitear "$GATE" "$REPORTE"

echo
echo "veredicto: ${VEREDICTO:-(no encontrado — revisar el reporte a mano)}"
echo "defectos reportados: $DEFECTOS"
echo "commit: $(git -C "$WT" log --oneline -1)"
