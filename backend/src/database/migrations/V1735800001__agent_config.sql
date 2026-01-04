CREATE TABLE IF NOT EXISTS "agentConfigurations" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    "agentId" VARCHAR(100) NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "configuration" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE("tenantId", "agentId")
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS "idx_agent_configurations_lookup" ON "agentConfigurations"("tenantId", "agentId");
