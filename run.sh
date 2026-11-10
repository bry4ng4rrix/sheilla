#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "Erreur : Docker n'est pas installé ou introuvable dans PATH." >&2
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "Erreur : le plugin Docker Compose n'est pas disponible." >&2
  exit 1
fi

mkdir -p data storage backups

if [[ ! -f .env.docker ]]; then
  auth_secret="$(openssl rand -base64 32 | tr -d '\n')"
  admin_password="$(openssl rand -hex 12)"
  demo_password="$(openssl rand -hex 12)"
  umask 077
  cat > .env.docker <<EOF
AUTH_SECRET=$auth_secret
APP_URL=http://localhost:3000
SEED_ADMIN_EMAIL=admin@jirama.mg
SEED_ADMIN_PASSWORD=$admin_password
SEED_DEMO_PASSWORD=$demo_password
EOF
  echo "Fichier .env.docker créé avec des secrets aléatoires."
fi

# Sur une installation vierge, restaure la sauvegarde locale la plus récente.
# Si aucune sauvegarde n'est présente (cas d'un clone Git), l'entrypoint Docker
# applique les migrations et charge automatiquement les données de démonstration.
if [[ ! -f data/grh.db ]]; then
  latest_backup="$(find backups -mindepth 2 -maxdepth 2 -type f -name grh.db -printf '%T@ %h\n' 2>/dev/null | sort -nr | head -n 1 | cut -d' ' -f2- || true)"
  if [[ -n "$latest_backup" ]]; then
    cp "$latest_backup/grh.db" data/grh.db
    if [[ -d "$latest_backup/storage" ]]; then
      cp -a "$latest_backup/storage/." storage/
    fi
    echo "Base restaurée depuis $latest_backup."
  else
    echo "Aucune sauvegarde locale trouvée : les données de démonstration seront créées au premier démarrage."
  fi
fi

docker compose up --build -d

echo
echo "Application démarrée : http://localhost:3000"
echo "Compte administrateur : $(sed -n 's/^SEED_ADMIN_EMAIL=//p' .env.docker)"
echo "Mot de passe administrateur : $(sed -n 's/^SEED_ADMIN_PASSWORD=//p' .env.docker)"
echo "Mot de passe des comptes RH/employés : $(sed -n 's/^SEED_DEMO_PASSWORD=//p' .env.docker)"
echo "Journaux : docker compose logs -f app"
