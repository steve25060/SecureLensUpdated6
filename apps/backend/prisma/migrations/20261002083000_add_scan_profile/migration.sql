-- Add the scan profile selected by the frontend/orchestrator.
-- Older migrations predate this column, while the current Prisma schema expects it.
ALTER TABLE "scans"
ADD COLUMN IF NOT EXISTS "profile" TEXT DEFAULT 'normal';
