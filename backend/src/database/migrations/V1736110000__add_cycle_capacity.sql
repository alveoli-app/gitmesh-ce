-- Add targetCapacity column to devtelCycles table
-- This allows each cycle to have its own configurable capacity instead of a fixed max

ALTER TABLE "devtelCycles" 
ADD COLUMN IF NOT EXISTS "targetCapacity" DECIMAL(10,2);

-- Add archive columns for soft delete with 30-day retention
ALTER TABLE "devtelCycles"
ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "permanentDeleteAt" TIMESTAMPTZ;

-- Add index for archived cycles
CREATE INDEX IF NOT EXISTS idx_devtel_cycles_archived ON "devtelCycles"("archivedAt") WHERE "archivedAt" IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN "devtelCycles"."targetCapacity" IS 'Target capacity for the cycle in story points or hours. Can be set per cycle for flexibility.';
COMMENT ON COLUMN "devtelCycles"."archivedAt" IS 'Timestamp when the cycle was archived (soft deleted). Archived cycles are kept for 30 days.';
COMMENT ON COLUMN "devtelCycles"."permanentDeleteAt" IS 'Timestamp when the cycle will be permanently deleted (archivedAt + 30 days).';

