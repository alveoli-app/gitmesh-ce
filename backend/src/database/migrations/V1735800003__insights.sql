-- NEW Tables for Phase 8: Insights & Proactive Intelligence
-- agentInsights, insightDismissals, and insightRateLimits already exist in V1735800000

CREATE TABLE IF NOT EXISTS "insightActions" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "insightId" UUID NOT NULL REFERENCES "agentInsights"(id) ON DELETE CASCADE,
    "userId" UUID REFERENCES users(id) ON DELETE SET NULL,
    "actionType" VARCHAR(50) NOT NULL,
    "executedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "notifications" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    "recipientId" UUID REFERENCES users(id) ON DELETE CASCADE,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT,
    "meta" JSONB DEFAULT '{}',
    "isRead" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
