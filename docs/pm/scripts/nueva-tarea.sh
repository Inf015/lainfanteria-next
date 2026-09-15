#!/usr/bin/env bash
# Crea el worktree, la rama y la carpeta de una tarea con los briefs prellenados.
#
#   docs/pm/scripts/nueva-tarea.sh T-012 galeria-autos [--base <ref>] [--desde <dir>] [--sin-npm]
#
# --desde toma brief-dev.md y brief-qa.md ya escritos (p. ej. docs/pm/backlog/T-012)
# en vez de las plantillas en blanco. Rama, worktree y base se rellenan igual.
#
# WORKTREES_DIR cambia dónde se crea el worktree (por defecto, al lado del repo actual).
set -euo pipefail

uso() { echo "uso: $0 T-NNN <slug-en-kebab> [--base <ref>] [--desde <dir>] [--sin-npm]" >&2; exit 2; }

[[ $# -ge 2 ]] || uso
ID=$1; SLUG=$2; shift 2
BASE=origin/main; NPM=1; DESDE=
while [[ $# -gt 0 ]]; do
  case $1 in
    --base) BASE=${2:?falta la ref de --base}; shift 2 ;;
    --desde) DESDE=${2:?falta el directorio de --desde}; shift 2 ;;
    --sin-npm) NPM=0; shift ;;
    *) uso ;;
  esac
done

[[ $ID =~ ^T-[0-9]{3}$ ]] || { echo "ID inválido: $ID (formato T-NNN)" >&2; exit 2; }
[[ $SLUG =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || { echo "slug inválido: $SLUG (kebab-case, minúsculas)" >&2; exit 2; }

RAIZ=$(git rev-parse --show-toplevel)
RAMA="oliver132123/$SLUG"
WT="${WORKTREES_DIR:-$(dirname "$RAIZ")}/lainfanteria-next-$SLUG"
DIR_TAREA="docs/pm/tareas/$ID"

if [[ -n $DESDE ]]; then
  DESDE=$(cd "$DESDE" && pwd -P)
  for f in brief-dev.md brief-qa.md; do
    [[ -f $DESDE/$f ]] || { echo "falta $DESDE/$f" >&2; exit 1; }
  done
  grep -q "^# $ID " "$DESDE/brief-dev.md" \
    || { echo "$DESDE/brief-dev.md no es de $ID (el título debe empezar con '# $ID ')" >&2; exit 1; }
fi

[[ $BASE == origin/* ]] && git -C "$RAIZ" fetch --quiet origin

git -C "$RAIZ" rev-parse --verify --quiet "$BASE^{commit}" >/dev/null \
  || { echo "la base $BASE no existe" >&2; exit 1; }
git -C "$RAIZ" cat-file -e "$BASE:docs/pm/contexto.md" 2>/dev/null \
  || { echo "la base $BASE no tiene docs/pm/ — mergeá el kit de PM o apilá sobre una rama que lo tenga" >&2; exit 1; }
if git -C "$RAIZ" rev-parse --verify --quiet "refs/heads/$RAMA" >/dev/null; then
  echo "la rama $RAMA ya existe" >&2; exit 1
fi
[[ ! -e $WT ]] || { echo "ya existe $WT" >&2; exit 1; }
if git -C "$RAIZ" cat-file -e "$BASE:$DIR_TAREA" 2>/dev/null; then
  echo "$DIR_TAREA ya existe en $BASE — elegí otro ID" >&2; exit 1
fi

git -C "$RAIZ" worktree add --quiet -b "$RAMA" "$WT" "$BASE"
WT=$(cd "$WT" && pwd -P)

mkdir -p "$WT/$DIR_TAREA"
# Las plantillas salen de la base, no del checkout actual: así la tarea usa la
# misma versión del proceso que va a ver el dev.
rellenar() {
  if [[ -n $DESDE ]]; then cat "$DESDE/$1"; else git -C "$RAIZ" show "$BASE:docs/pm/plantillas/$1"; fi | sed \
    -e "s|T-NNN|$ID|g" \
    -e "s|oliver132123/<slug>|$RAMA|g" \
    -e "s|\`<ruta absoluta>\`|\`$WT\`|g" \
    -e "s#^| Base | .*#| Base | \`$BASE\` |#"
}
rellenar brief-dev.md > "$WT/$DIR_TAREA/brief-dev.md"
rellenar brief-qa.md  > "$WT/$DIR_TAREA/brief-qa.md"

# .env.local no se versiona: se copia del checkout principal si existe, para
# que el PM pueda correr las suites de seguridad y humo desde el worktree.
PRINCIPAL=$(git -C "$RAIZ" worktree list --porcelain | sed -n '1s/^worktree //p')
if [[ -f $PRINCIPAL/.env.local ]]; then
  cp -p "$PRINCIPAL/.env.local" "$WT/.env.local"
  chmod 600 "$WT/.env.local"
  ENV_MSG="copiado de $PRINCIPAL"
else
  ENV_MSG="NO encontrado — test:seguridad y test:humo no van a correr"
fi

if [[ $NPM -eq 1 ]]; then
  echo "npm ci en $WT ..."
  (cd "$WT" && npm ci --silent --no-audit --no-fund)
fi

cat <<EOF

Tarea $ID lista
  worktree : $WT
  rama     : $RAMA  (desde $BASE)
  briefs   : $WT/$DIR_TAREA/brief-{dev,qa}.md
  .env.local: $ENV_MSG
  node_modules: $([[ $NPM -eq 1 ]] && echo instalado || echo "NO instalado (--sin-npm)")

Siguiente:
  1. Completar brief-dev.md y brief-qa.md (todo lo que está entre <>)
  2. Commitear los briefs en la rama:  git -C "$WT" add $DIR_TAREA && git -C "$WT" commit -m "docs(pm): brief $ID"
  3. Agregar la fila en docs/pm/tablero.md
  4. Lanzar el dev con docs/pm/plantillas/prompts.md
EOF
