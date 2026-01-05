--
-- DevTel Foundation Tables
-- Creates all core tables for the DevTel project management feature
--

-- DevTel Workspaces (1:1 with tenants for simplicity)
CREATE TABLE "devtelWorkspaces" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    settings JSONB DEFAULT '{}',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deletedAt" TIMESTAMPTZ,
    "createdById" UUID REFERENCES users(id),
    "updatedById" UUID REFERENCES users(id)
);

CREATE UNIQUE INDEX idx_devtel_workspaces_tenant ON "devtelWorkspaces"("tenantId") WHERE "deletedAt" IS NULL;

-- DevTel Projects
CREATE TABLE "devtelProjects" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "workspaceId" UUID NOT NULL REFERENCES "devtelWorkspaces"(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    settings JSONB DEFAULT '{}',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deletedAt" TIMESTAMPTZ,
    "createdById" UUID REFERENCES users(id),
    "updatedById" UUID REFERENCES users(id)
);

CREATE INDEX idx_devtel_projects_workspace ON "devtelProjects"("workspaceId") WHERE "deletedAt" IS NULL;

-- DevTel Cycles (Sprints)
CREATE TABLE "devtelCycles" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "projectId" UUID NOT NULL REFERENCES "devtelProjects"(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    goal TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'planned',
    "targetCapacity" DECIMAL(10,2),
    velocity INTEGER,
    "storyPointsCompleted" INTEGER,
    "archivedAt" TIMESTAMPTZ,
    "permanentDeleteAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deletedAt" TIMESTAMPTZ,
    "createdById" UUID REFERENCES users(id),
    "updatedById" UUID REFERENCES users(id)
);

CREATE INDEX idx_devtel_cycles_project ON "devtelCycles"("projectId") WHERE "deletedAt" IS NULL;
CREATE INDEX idx_devtel_cycles_status ON "devtelCycles"(status) WHERE "deletedAt" IS NULL;
CREATE INDEX idx_devtel_cycles_archived ON "devtelCycles"("archivedAt") WHERE "archivedAt" IS NOT NULL;

-- DevTel Issues
CREATE TABLE "devtelIssues" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "projectId" UUID NOT NULL REFERENCES "devtelProjects"(id) ON DELETE CASCADE,
    "cycleId" UUID REFERENCES "devtelCycles"(id) ON DELETE SET NULL,
    "parentIssueId" UUID REFERENCES "devtelIssues"(id) ON DELETE SET NULL,
    "assigneeId" UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'backlog',
    priority VARCHAR(50) NOT NULL DEFAULT 'medium',
    "estimatedHours" DECIMAL(10,2),
    "actualHours" DECIMAL(10,2),
    "complexityScore" INTEGER,
    "storyPoints" INTEGER,
    metadata JSONB DEFAULT '{}',
    "searchSyncedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deletedAt" TIMESTAMPTZ,
    "createdById" UUID REFERENCES users(id),
    "updatedById" UUID REFERENCES users(id)
);

CREATE INDEX idx_devtel_issues_project ON "devtelIssues"("projectId") WHERE "deletedAt" IS NULL;
CREATE INDEX idx_devtel_issues_cycle ON "devtelIssues"("cycleId") WHERE "deletedAt" IS NULL;
CREATE INDEX idx_devtel_issues_assignee ON "devtelIssues"("assigneeId") WHERE "deletedAt" IS NULL;
CREATE INDEX idx_devtel_issues_status ON "devtelIssues"(status) WHERE "deletedAt" IS NULL;
CREATE INDEX idx_devtel_issues_priority ON "devtelIssues"(priority) WHERE "deletedAt" IS NULL;
CREATE INDEX idx_devtel_issues_parent ON "devtelIssues"("parentIssueId") WHERE "deletedAt" IS NULL;
CREATE INDEX idx_devtel_issues_search_sync ON "devtelIssues"("searchSyncedAt") WHERE "deletedAt" IS NULL;

-- DevTel Issue Assignments (junction table with allocated hours)
CREATE TABLE "devtelIssueAssignments" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "issueId" UUID NOT NULL REFERENCES "devtelIssues"(id) ON DELETE CASCADE,
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "allocatedHours" DECIMAL(10,2),
    "scheduledDate" DATE,
    role VARCHAR(50) DEFAULT 'assignee',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_devtel_issue_assignments_issue ON "devtelIssueAssignments"("issueId");
CREATE INDEX idx_devtel_issue_assignments_user ON "devtelIssueAssignments"("userId");
CREATE INDEX idx_devtel_issue_assignments_date ON "devtelIssueAssignments"("scheduledDate");
CREATE UNIQUE INDEX idx_devtel_issue_assignments_unique ON "devtelIssueAssignments"("issueId", "userId", "scheduledDate");

-- DevTel Issue Comments
CREATE TABLE "devtelIssueComments" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "issueId" UUID NOT NULL REFERENCES "devtelIssues"(id) ON DELETE CASCADE,
    "authorId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deletedAt" TIMESTAMPTZ
);

CREATE INDEX idx_devtel_issue_comments_issue ON "devtelIssueComments"("issueId") WHERE "deletedAt" IS NULL;

-- DevTel Spec Documents
CREATE TABLE "devtelSpecDocuments" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "projectId" UUID NOT NULL REFERENCES "devtelProjects"(id) ON DELETE CASCADE,
    "authorId" UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    content JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'draft',
    "searchSyncedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deletedAt" TIMESTAMPTZ,
    "createdById" UUID REFERENCES users(id),
    "updatedById" UUID REFERENCES users(id)
);

CREATE INDEX idx_devtel_specs_project ON "devtelSpecDocuments"("projectId") WHERE "deletedAt" IS NULL;
CREATE INDEX idx_devtel_specs_author ON "devtelSpecDocuments"("authorId") WHERE "deletedAt" IS NULL;
CREATE INDEX idx_devtel_specs_status ON "devtelSpecDocuments"(status) WHERE "deletedAt" IS NULL;

-- DevTel Spec Versions (for version history)
CREATE TABLE "devtelSpecVersions" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "specId" UUID NOT NULL REFERENCES "devtelSpecDocuments"(id) ON DELETE CASCADE,
    "authorId" UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    content JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_devtel_spec_versions_spec ON "devtelSpecVersions"("specId");

-- DevTel Spec Comments
CREATE TABLE "devtelSpecComments" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "specId" UUID NOT NULL REFERENCES "devtelSpecDocuments"(id) ON DELETE CASCADE,
    "authorId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    "textReference" TEXT,
    resolved BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_devtel_spec_comments_spec ON "devtelSpecComments"("specId");

-- DevTel External Links (polymorphic links to GitHub/Jira/etc)
CREATE TABLE "devtelExternalLinks" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "linkableType" VARCHAR(100) NOT NULL,
    "linkableId" UUID NOT NULL,
    "externalType" VARCHAR(100) NOT NULL,
    "externalId" VARCHAR(255),
    url TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    "lastSyncedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_devtel_external_links_linkable ON "devtelExternalLinks"("linkableType", "linkableId");
CREATE INDEX idx_devtel_external_links_external ON "devtelExternalLinks"("externalType", "externalId");

-- DevTel Jobs (Temporal workflow tracking)
CREATE TABLE "devtelJobs" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "workflowId" VARCHAR(255),
    "jobType" VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    payload JSONB,
    result JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMPTZ,
    "completedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_devtel_jobs_status ON "devtelJobs"(status);
CREATE INDEX idx_devtel_jobs_workflow ON "devtelJobs"("workflowId");
CREATE INDEX idx_devtel_jobs_type ON "devtelJobs"("jobType");

-- DevTel MCP Tool Calls (audit log for AI agent actions)
CREATE TABLE "devtelMcpToolCalls" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "agentId" VARCHAR(255),
    "toolName" VARCHAR(255) NOT NULL,
    parameters JSONB,
    result JSONB,
    "executionTimeMs" INTEGER,
    success BOOLEAN DEFAULT TRUE,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_devtel_mcp_calls_agent ON "devtelMcpToolCalls"("agentId");
CREATE INDEX idx_devtel_mcp_calls_tool ON "devtelMcpToolCalls"("toolName");
CREATE INDEX idx_devtel_mcp_calls_created ON "devtelMcpToolCalls"("createdAt");

-- DevTel User Skills
CREATE TABLE "devtelUserSkills" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "workspaceId" UUID NOT NULL REFERENCES "devtelWorkspaces"(id) ON DELETE CASCADE,
    skill VARCHAR(255) NOT NULL,
    level VARCHAR(50) DEFAULT 'intermediate',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_devtel_user_skills_user ON "devtelUserSkills"("userId");
CREATE INDEX idx_devtel_user_skills_workspace ON "devtelUserSkills"("workspaceId");
CREATE UNIQUE INDEX idx_devtel_user_skills_unique ON "devtelUserSkills"("userId", "workspaceId", skill);

-- DevTel Cycle Snapshots (for burndown charts)
CREATE TABLE "devtelCycleSnapshots" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "cycleId" UUID NOT NULL REFERENCES "devtelCycles"(id) ON DELETE CASCADE,
    "totalIssues" INTEGER,
    "completedIssues" INTEGER,
    "inProgressIssues" INTEGER,
    "blockedIssues" INTEGER,
    "totalHours" DECIMAL(10,2),
    "actualHours" DECIMAL(10,2),
    "snapshotDate" DATE NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_devtel_cycle_snapshots_cycle ON "devtelCycleSnapshots"("cycleId");
CREATE UNIQUE INDEX idx_devtel_cycle_snapshots_unique ON "devtelCycleSnapshots"("cycleId", "snapshotDate");

-- DevTel User Saved Filters
CREATE TABLE "devtelUserSavedFilters" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "workspaceId" UUID NOT NULL REFERENCES "devtelWorkspaces"(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    "filterType" VARCHAR(100) NOT NULL,
    config JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_devtel_saved_filters_user ON "devtelUserSavedFilters"("userId");
CREATE INDEX idx_devtel_saved_filters_workspace ON "devtelUserSavedFilters"("workspaceId");

-- DevTel Workspace Settings
CREATE TABLE "devtelWorkspaceSettings" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "workspaceId" UUID NOT NULL REFERENCES "devtelWorkspaces"(id) ON DELETE CASCADE UNIQUE,
    "defaultCycleLength" INTEGER DEFAULT 14,
    "storyPointScale" VARCHAR(50) DEFAULT 'fibonacci',
    "velocityMethod" VARCHAR(50) DEFAULT 'average',
    settings JSONB DEFAULT '{}',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- DevTel Integrations (GitHub, Jira, etc)
CREATE TABLE "devtelIntegrations" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "workspaceId" UUID NOT NULL REFERENCES "devtelWorkspaces"(id) ON DELETE CASCADE,
    provider VARCHAR(100) NOT NULL,
    credentials JSONB,
    settings JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'pending',
    "lastSyncedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_devtel_integrations_workspace ON "devtelIntegrations"("workspaceId");
CREATE UNIQUE INDEX idx_devtel_integrations_unique ON "devtelIntegrations"("workspaceId", provider);

-- DevTel Webhooks
CREATE TABLE "devtelWebhooks" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "workspaceId" UUID NOT NULL REFERENCES "devtelWorkspaces"(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    secret VARCHAR(255),
    events TEXT[] NOT NULL DEFAULT '{}',
    enabled BOOLEAN DEFAULT TRUE,
    "lastDeliveryAt" TIMESTAMPTZ,
    "deliveryStats" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_devtel_webhooks_workspace ON "devtelWebhooks"("workspaceId");

-- DevTel Webhook Delivery Logs
CREATE TABLE "devtelWebhookDeliveryLogs" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "webhookId" UUID NOT NULL REFERENCES "devtelWebhooks"(id) ON DELETE CASCADE,
    event VARCHAR(100) NOT NULL,
    payload JSONB,
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    success BOOLEAN,
    "attemptNumber" INTEGER DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_devtel_webhook_logs_webhook ON "devtelWebhookDeliveryLogs"("webhookId");
CREATE INDEX idx_devtel_webhook_logs_created ON "devtelWebhookDeliveryLogs"("createdAt");

-- DevTel Agent Settings
CREATE TABLE "devtelAgentSettings" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "workspaceId" UUID NOT NULL REFERENCES "devtelWorkspaces"(id) ON DELETE CASCADE UNIQUE,
    "enabledAgents" TEXT[] DEFAULT '{}',
    temperature DECIMAL(3,2) DEFAULT 0.7,
    "approvalRequired" BOOLEAN DEFAULT TRUE,
    "customPrompts" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- DevTel Team Artifacts (examples for AI learning)
CREATE TABLE "devtelTeamArtifacts" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "workspaceId" UUID NOT NULL REFERENCES "devtelWorkspaces"(id) ON DELETE CASCADE,
    "artifactType" VARCHAR(100) NOT NULL,
    title VARCHAR(500),
    content JSONB NOT NULL,
    "isExample" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_devtel_artifacts_workspace ON "devtelTeamArtifacts"("workspaceId");
CREATE INDEX idx_devtel_artifacts_type ON "devtelTeamArtifacts"("artifactType");

-- GitHub Webhook Delivery Logs (for debugging)
CREATE TABLE "devtelGithubWebhookLogs" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "workspaceId" UUID REFERENCES "devtelWorkspaces"(id) ON DELETE SET NULL,
    "deliveryId" VARCHAR(255),
    event VARCHAR(100) NOT NULL,
    payload JSONB,
    "signatureValid" BOOLEAN,
    processed BOOLEAN DEFAULT FALSE,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_devtel_github_logs_workspace ON "devtelGithubWebhookLogs"("workspaceId");
CREATE INDEX idx_devtel_github_logs_delivery ON "devtelGithubWebhookLogs"("deliveryId");
