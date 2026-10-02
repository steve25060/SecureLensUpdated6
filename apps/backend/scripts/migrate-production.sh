#!/bin/sh
set -eu

cd /app/apps/backend 2>/dev/null || cd "$(dirname "$0")/.."

echo "[db] Applying Prisma migrations..."
set +e
MIGRATE_OUTPUT="$(pnpm exec prisma migrate deploy 2>&1)"
MIGRATE_STATUS=$?
set -e
printf '%s\n' "$MIGRATE_OUTPUT"

if [ "$MIGRATE_STATUS" -eq 0 ]; then
  echo "[db] Prisma migrations applied."
  exit 0
fi

if printf '%s' "$MIGRATE_OUTPUT" | grep -q 'P3005'; then
  echo "[db] Existing schema has no Prisma migration history."
  echo "[db] Synchronizing the current schema without destructive flags..."
  pnpm exec prisma db push

  # The old Railway deployment used prisma db push directly, so the database
  # can already match the current schema while lacking _prisma_migrations.
  # Mark schema/history migrations as applied, but deliberately leave the
  # final cleanup migration pending so its data cleanup actually executes.
  CLEANUP_MIGRATION="20261002084500_remove_legacy_test_user"
  for migration_path in prisma/migrations/*; do
    [ -d "$migration_path" ] || continue
    migration_name="$(basename "$migration_path")"
    if [ "$migration_name" = "$CLEANUP_MIGRATION" ]; then
      continue
    fi
    pnpm exec prisma migrate resolve --applied "$migration_name"
  done

  echo "[db] Running pending post-baseline migrations..."
  pnpm exec prisma migrate deploy

  echo "[db] Existing database baselined successfully."
  exit 0
fi

echo "[db] Migration failed; backend startup stopped." >&2
exit "$MIGRATE_STATUS"
