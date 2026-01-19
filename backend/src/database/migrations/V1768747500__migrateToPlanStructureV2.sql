-- Complete migration to new plan structure
-- This migration removes old plan names (Essential, Growth, Signals, Scale)
-- and keeps only new plans (Pro, Teams+, Enterprise)

-- Step 1: Create new enum type with only the new plan values
CREATE TYPE tenant_plans_type_new AS ENUM ('Pro', 'Teams+', 'Enterprise');

-- Step 2: Drop default constraint (required before type conversion)
ALTER TABLE tenants ALTER COLUMN plan DROP DEFAULT;

-- Step 3: Convert the column to use new type with data migration
-- Maps: Essential, Growth, Pro -> Pro
--       Scale, Signals, Teams+ -> Teams+
--       Enterprise -> Enterprise
ALTER TABLE tenants ALTER COLUMN plan TYPE tenant_plans_type_new 
USING (
  CASE 
    WHEN plan::text IN ('Essential', 'Growth', 'Pro') THEN 'Pro'::tenant_plans_type_new
    WHEN plan::text IN ('Scale', 'Signals', 'Teams+') THEN 'Teams+'::tenant_plans_type_new
    ELSE 'Enterprise'::tenant_plans_type_new
  END
);

-- Step 4: Set default value for new type
ALTER TABLE tenants ALTER COLUMN plan SET DEFAULT 'Pro'::tenant_plans_type_new;

-- Step 5: Drop the old enum type
DROP TYPE tenant_plans_type;

-- Step 6: Rename the new enum type to the original name
ALTER TYPE tenant_plans_type_new RENAME TO tenant_plans_type;

-- Verify: Should show only Pro, Teams+, Enterprise
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'tenant_plans_type') 
ORDER BY enumsortorder;
