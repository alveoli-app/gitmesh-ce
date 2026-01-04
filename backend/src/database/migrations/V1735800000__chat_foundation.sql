-- ============================================
-- Chat Tab Foundation Migration
-- AI-powered command center for DevSpace
-- ============================================

-- ============================================
-- Chat Conversations
-- Multi-conversation storage with context
-- ============================================
CREATE TABLE IF NOT EXISTS "chatConversations" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL REFERENCES tenants(id) ON UPDATE CASCADE,
    "userId" UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    "projectId" UUID,  -- Optional: conversation scoped to a project
    "workspaceId" UUID,
    title VARCHAR(500),
    status VARCHAR(20) DEFAULT 'active',  -- active, archived, deleted
    context JSONB DEFAULT '{}',  -- Stored context chips (project, cycle, issue focus)
    metadata JSONB DEFAULT '{}',  -- Additional metadata
    "lastMessageAt" TIMESTAMP WITH TIME ZONE,
    "messageCount" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "deletedAt" TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_chat_conversations_tenant_user ON "chatConversations" ("tenantId", "userId") WHERE "deletedAt" IS NULL;
CREATE INDEX idx_chat_conversations_last_message ON "chatConversations" ("userId", "lastMessageAt" DESC) WHERE "deletedAt" IS NULL;
CREATE INDEX idx_chat_conversations_project ON "chatConversations" ("projectId") WHERE "projectId" IS NOT NULL AND "deletedAt" IS NULL;

-- ============================================
-- Chat Messages
-- Individual messages with streaming support
-- ============================================
CREATE TABLE IF NOT EXISTS "chatMessages" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "conversationId" UUID NOT NULL REFERENCES "chatConversations"(id) ON UPDATE CASCADE ON DELETE CASCADE,
    "senderType" VARCHAR(20) NOT NULL,  -- user, agent, system, suggestion
    "agentId" VARCHAR(100),  -- Which agent sent this (for agent messages)
    content TEXT NOT NULL,
    "contentType" VARCHAR(50) DEFAULT 'text',  -- text, markdown, action_card, rich
    metadata JSONB DEFAULT '{}',  -- Contains proposalIds, mentionedEntities, etc.
    "parentMessageId" UUID,  -- For threaded replies
    "isStreaming" BOOLEAN DEFAULT false,
    "streamCompletedAt" TIMESTAMP WITH TIME ZONE,
    "tokensUsed" INTEGER,
    "durationMs" INTEGER,
    "feedbackRating" INTEGER,  -- 1-5 stars
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_conversation ON "chatMessages" ("conversationId", "createdAt" ASC);
CREATE INDEX idx_chat_messages_agent ON "chatMessages" ("agentId", "createdAt" DESC) WHERE "agentId" IS NOT NULL;

-- ============================================
-- Chat Action Proposals
-- Agent action proposals awaiting approval
-- ============================================
CREATE TABLE IF NOT EXISTS "chatActionProposals" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "conversationId" UUID NOT NULL REFERENCES "chatConversations"(id) ON UPDATE CASCADE ON DELETE CASCADE,
    "messageId" UUID REFERENCES "chatMessages"(id) ON UPDATE CASCADE ON DELETE SET NULL,
    "agentId" VARCHAR(100) NOT NULL,
    "actionType" VARCHAR(100) NOT NULL,  -- create_issue, update_issue, assign_issue, etc.
    parameters JSONB NOT NULL,  -- Full parameters for the action
    reasoning TEXT,  -- Agent's explanation for this action
    "affectedEntities" JSONB DEFAULT '[]',  -- Array of {type, id, name}
    "estimatedImpact" TEXT,
    "confidenceScore" DECIMAL(3,2),  -- 0.00 to 1.00
    status VARCHAR(20) DEFAULT 'pending',  -- pending, approved, rejected, expired, modified
    "rejectionReason" TEXT,
    "modifiedProposalId" UUID,  -- If modified, links to new proposal
    "expiresAt" TIMESTAMP WITH TIME ZONE,  -- Auto-expire after 1 hour by default
    "respondedAt" TIMESTAMP WITH TIME ZONE,
    "respondedBy" UUID REFERENCES users(id),
    "batchId" UUID,  -- Group related proposals
    "batchOrder" INTEGER,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_proposals_conversation ON "chatActionProposals" ("conversationId", "createdAt" DESC);
CREATE INDEX idx_chat_proposals_pending ON "chatActionProposals" (status, "expiresAt") WHERE status = 'pending';
CREATE INDEX idx_chat_proposals_batch ON "chatActionProposals" ("batchId") WHERE "batchId" IS NOT NULL;

-- ============================================
-- Chat Executed Actions
-- Audit log of executed actions
-- ============================================
CREATE TABLE IF NOT EXISTS "chatExecutedActions" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "proposalId" UUID REFERENCES "chatActionProposals"(id) ON UPDATE CASCADE ON DELETE SET NULL,
    "conversationId" UUID NOT NULL REFERENCES "chatConversations"(id) ON UPDATE CASCADE ON DELETE CASCADE,
    "tenantId" UUID NOT NULL REFERENCES tenants(id) ON UPDATE CASCADE,
    "executedBy" UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE,
    "agentId" VARCHAR(100) NOT NULL,
    "actionType" VARCHAR(100) NOT NULL,
    parameters JSONB NOT NULL,
    result JSONB,  -- API response
    status VARCHAR(20) NOT NULL,  -- success, failed, reverted
    "errorMessage" TEXT,
    "affectedEntityType" VARCHAR(100),
    "affectedEntityId" UUID,
    "isReversible" BOOLEAN DEFAULT false,
    "revertedAt" TIMESTAMP WITH TIME ZONE,
    "revertedBy" UUID REFERENCES users(id),
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_executed_tenant ON "chatExecutedActions" ("tenantId", "createdAt" DESC);
CREATE INDEX idx_chat_executed_conversation ON "chatExecutedActions" ("conversationId", "createdAt" DESC);
CREATE INDEX idx_chat_executed_entity ON "chatExecutedActions" ("affectedEntityType", "affectedEntityId");

-- ============================================
-- Agent Telemetry
-- CrewAI telemetry data
-- ============================================
CREATE TABLE IF NOT EXISTS "agentTelemetry" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL REFERENCES tenants(id) ON UPDATE CASCADE,
    "agentName" VARCHAR(100) NOT NULL,
    "taskType" VARCHAR(100) NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "tokensUsed" INTEGER,
    success BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    metadata JSONB DEFAULT '{}',
    "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_telemetry_tenant ON "agentTelemetry" ("tenantId", "timestamp" DESC);
CREATE INDEX idx_agent_telemetry_agent ON "agentTelemetry" ("agentName", "timestamp" DESC);
CREATE INDEX idx_agent_telemetry_success ON "agentTelemetry" ("tenantId", success, "timestamp" DESC);

-- ============================================
-- Agent Tool Logs
-- Detailed tool invocation logs
-- ============================================
CREATE TABLE IF NOT EXISTS "agentToolLogs" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "requestId" VARCHAR(100) UNIQUE,
    "toolName" VARCHAR(100) NOT NULL,
    parameters JSONB NOT NULL,
    response JSONB,
    "statusCode" INTEGER,
    "durationMs" INTEGER,
    "agentId" VARCHAR(100),
    "conversationId" UUID REFERENCES "chatConversations"(id) ON UPDATE CASCADE ON DELETE SET NULL,
    "tenantId" UUID NOT NULL REFERENCES tenants(id) ON UPDATE CASCADE,
    "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_tool_logs_tenant ON "agentToolLogs" ("tenantId", "timestamp" DESC);
CREATE INDEX idx_agent_tool_logs_tool ON "agentToolLogs" ("toolName", "timestamp" DESC);
CREATE INDEX idx_agent_tool_logs_conversation ON "agentToolLogs" ("conversationId") WHERE "conversationId" IS NOT NULL;

-- ============================================
-- Agent Insights
-- Proactive insights from agents
-- ============================================
CREATE TABLE IF NOT EXISTS "agentInsights" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL REFERENCES tenants(id) ON UPDATE CASCADE,
    "projectId" UUID,
    "agentId" VARCHAR(100) NOT NULL,
    "insightType" VARCHAR(50) NOT NULL,  -- warning, opportunity, recommendation
    severity VARCHAR(20) NOT NULL,  -- low, medium, high, critical
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    "affectedEntities" JSONB DEFAULT '[]',  -- Array of {type, id, name}
    "suggestedActions" JSONB DEFAULT '[]',  -- Array of suggested actions
    confidence DECIMAL(3,2),  -- 0.00 to 1.00
    category VARCHAR(50),  -- capacity, velocity, quality, opportunity
    status VARCHAR(20) DEFAULT 'active',  -- active, resolved, dismissed, expired
    "deduplicationKey" VARCHAR(255),  -- For preventing duplicate insights
    "resolvedAt" TIMESTAMP WITH TIME ZONE,
    "resolvedBy" UUID REFERENCES users(id),
    "expiresAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_insights_tenant_status ON "agentInsights" ("tenantId", status, "createdAt" DESC);
CREATE INDEX idx_agent_insights_project ON "agentInsights" ("projectId", status) WHERE "projectId" IS NOT NULL;
CREATE INDEX idx_agent_insights_dedup ON "agentInsights" ("tenantId", "deduplicationKey") WHERE "deduplicationKey" IS NOT NULL;
CREATE INDEX idx_agent_insights_category ON "agentInsights" ("tenantId", category, "createdAt" DESC);

-- ============================================
-- Agent Feedback
-- User feedback on agent responses
-- ============================================
CREATE TABLE IF NOT EXISTS "agentFeedback" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "messageId" UUID NOT NULL REFERENCES "chatMessages"(id) ON UPDATE CASCADE ON DELETE CASCADE,
    "userId" UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    "tenantId" UUID NOT NULL REFERENCES tenants(id) ON UPDATE CASCADE,
    "agentId" VARCHAR(100),
    rating INTEGER NOT NULL,  -- 1-5 stars
    categories VARCHAR(100)[],  -- incorrect_info, poor_reasoning, unhelpful, slow, other
    comment TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_feedback_message ON "agentFeedback" ("messageId");
CREATE INDEX idx_agent_feedback_agent ON "agentFeedback" ("agentId", "createdAt" DESC) WHERE "agentId" IS NOT NULL;
CREATE INDEX idx_agent_feedback_tenant ON "agentFeedback" ("tenantId", "createdAt" DESC);

-- ============================================
-- Insight Dismissals
-- Tracking dismissed insights with reasons
-- ============================================
CREATE TABLE IF NOT EXISTS "insightDismissals" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "insightId" UUID NOT NULL REFERENCES "agentInsights"(id) ON UPDATE CASCADE ON DELETE CASCADE,
    "userId" UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    reason VARCHAR(100) NOT NULL,  -- not_relevant, already_addressed, incorrect, too_noisy
    comment TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_insight_dismissals_insight ON "insightDismissals" ("insightId");
CREATE INDEX idx_insight_dismissals_user ON "insightDismissals" ("userId", "createdAt" DESC);

-- ============================================
-- Conversation Memory
-- Persistent memory for conversations
-- ============================================
CREATE TABLE IF NOT EXISTS "conversationMemory" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "conversationId" UUID NOT NULL REFERENCES "chatConversations"(id) ON UPDATE CASCADE ON DELETE CASCADE,
    summary TEXT NOT NULL,
    "keyDecisions" JSONB DEFAULT '[]',
    "actionItems" JSONB DEFAULT '[]',
    "learnedFacts" JSONB DEFAULT '[]',
    -- embedding VECTOR(1536),  -- For semantic search (if pgvector is enabled)
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversation_memory_conversation ON "conversationMemory" ("conversationId", "createdAt" DESC);

-- ============================================
-- Insight Rate Limits
-- Track insight generation for rate limiting
-- ============================================
CREATE TABLE IF NOT EXISTS "insightRateLimits" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL REFERENCES tenants(id) ON UPDATE CASCADE,
    "projectId" UUID,
    "agentId" VARCHAR(100) NOT NULL,
    "insightCount" INTEGER DEFAULT 0,
    "lastInsightAt" TIMESTAMP WITH TIME ZONE,
    "windowStart" DATE NOT NULL,  -- Daily window
    UNIQUE ("tenantId", "projectId", "agentId", "windowStart")
);

CREATE INDEX idx_insight_rate_limits_lookup ON "insightRateLimits" ("tenantId", "projectId", "agentId", "windowStart");
