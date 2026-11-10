#!/bin/sh
set -eu

db_file="/app/data/grh.db"
first_start=0
if [ ! -f "$db_file" ]; then
  first_start=1
fi

pnpm db:deploy

if [ "$first_start" = "1" ]; then
  : "${SEED_ADMIN_PASSWORD:?Définissez SEED_ADMIN_PASSWORD dans .env.docker}"
  : "${SEED_DEMO_PASSWORD:?Définissez SEED_DEMO_PASSWORD dans .env.docker}"
  NODE_ENV=development pnpm db:seed
fi

exec pnpm start
