CREATE TABLE IF NOT EXISTS "complianceExports" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    "generatedBy" UUID NOT NULL REFERENCES users(id),
    "criteria" JSONB NOT NULL DEFAULT '{}',
    "signatureHash" VARCHAR(256) NOT NULL,
    "fileUrl" TEXT,
    "format" VARCHAR(20) DEFAULT 'csv',
    "actionCount" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for listing exports by tenant
CREATE INDEX IF NOT EXISTS "idx_compliance_exports_tenant" ON "complianceExports"("tenantId", "createdAt" DESC);
