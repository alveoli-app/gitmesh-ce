-- Add new plan enum values for the enterprise edition restructure
-- This migration adds 'Pro' and 'Teams+' to the tenant_plans_type enum
-- while maintaining backwards compatibility with existing plans

-- Add 'Pro' enum value
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'Pro' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'tenant_plans_type')
    ) THEN
        ALTER TYPE tenant_plans_type ADD VALUE 'Pro';
    END IF;
END $$;

-- Add 'Teams+' enum value
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'Teams+' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'tenant_plans_type')
    ) THEN
        ALTER TYPE tenant_plans_type ADD VALUE 'Teams+';
    END IF;
END $$;
