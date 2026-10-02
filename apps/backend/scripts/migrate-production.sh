#!/bin/sh
set -eu
cd /app/apps/backend 2>/dev/null || cd "$(dirname "$0")/.."
pnpm exec prisma migrate deploy
