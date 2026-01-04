-- DevTel Database Performance Indices
-- Add indices for frequently queried columns to improve performance

-- ============================================
-- Issues Table Indices
-- ============================================

-- Project-based queries (most common)
CREATE INDEX IF NOT EXISTS idx_devtel_issues_project_id 
ON "devtelIssues"("projectId") 
WHERE "deletedAt" IS NULL;

-- Status filtering
CREATE INDEX IF NOT EXISTS idx_devtel_issues_status 
ON "devtelIssues"("status") 
WHERE "deletedAt" IS NULL;

-- Assignee filtering
CREATE INDEX IF NOT EXISTS idx_devtel_issues_assignee_id 
ON "devtelIssues"("assigneeId") 
WHERE "deletedAt" IS NULL;

-- Cycle filtering
CREATE INDEX IF NOT EXISTS idx_devtel_issues_cycle_id 
ON "devtelIssues"("cycleId") 
WHERE "deletedAt" IS NULL;

-- Date sorting (created/updated)
CREATE INDEX IF NOT EXISTS idx_devtel_issues_created_at 
ON "devtelIssues"("createdAt" DESC) 
WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_devtel_issues_updated_at 
ON "devtelIssues"("updatedAt" DESC) 
WHERE "deletedAt" IS NULL;

-- Priority filtering
CREATE INDEX IF NOT EXISTS idx_devtel_issues_priority 
ON "devtelIssues"("priority") 
WHERE "deletedAt" IS NULL;

-- Composite index for common query pattern (project + status)
CREATE INDEX IF NOT EXISTS idx_devtel_issues_project_status 
ON "devtelIssues"("projectId", "status") 
WHERE "deletedAt" IS NULL;

-- Composite index for project + assignee
CREATE INDEX IF NOT EXISTS idx_devtel_issues_project_assignee 
ON "devtelIssues"("projectId", "assigneeId") 
WHERE "deletedAt" IS NULL;

-- Full-text search on title and description
CREATE INDEX IF NOT EXISTS idx_devtel_issues_search 
ON "devtelIssues" USING gin(to_tsvector('english', "title" || ' ' || COALESCE("description", '')));

-- ============================================
-- Cycles Table Indices
-- ============================================

CREATE INDEX IF NOT EXISTS idx_devtel_cycles_project_id 
ON "devtelCycles"("projectId") 
WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_devtel_cycles_status 
ON "devtelCycles"("status") 
WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_devtel_cycles_dates 
ON "devtelCycles"("startDate", "endDate") 
WHERE "deletedAt" IS NULL;

-- ============================================
-- Projects Table Indices
-- ============================================

CREATE INDEX IF NOT EXISTS idx_devtel_projects_workspace_id 
ON "devtelProjects"("workspaceId") 
WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_devtel_projects_prefix 
ON "devtelProjects"("prefix") 
WHERE "deletedAt" IS NULL;

-- ============================================
-- External Links Indices
-- ============================================

CREATE INDEX IF NOT EXISTS idx_devtel_external_links_linkable 
ON "devtelExternalLinks"("linkableType", "linkableId");

CREATE INDEX IF NOT EXISTS idx_devtel_external_links_type 
ON "devtelExternalLinks"("externalType");

-- ============================================
-- Comments Indices
-- ============================================

CREATE INDEX IF NOT EXISTS idx_devtel_issue_comments_issue_id 
ON "devtelIssueComments"("issueId") 
WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_devtel_issue_comments_created_at 
ON "devtelIssueComments"("createdAt" DESC) 
WHERE "deletedAt" IS NULL;

-- ============================================
-- Specs Indices
-- ============================================

-- idx_devtel_specs_project_id is redundant as idx_devtel_specs_project already exists in foundation migration

CREATE INDEX IF NOT EXISTS idx_devtel_specs_updated_at 
ON "devtelSpecDocuments"("updatedAt" DESC) 
WHERE "deletedAt" IS NULL;

-- ============================================
-- GitHub Commits Indices
-- ============================================

CREATE TABLE IF NOT EXISTS "devtelGithubCommits" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "workspaceId" UUID NOT NULL REFERENCES "devtelWorkspaces"(id) ON DELETE CASCADE,
    repository VARCHAR(255) NOT NULL,
    "commitHash" VARCHAR(40) NOT NULL,
    message TEXT,
    "authorName" VARCHAR(255),
    "authorEmail" VARCHAR(255),
    "committedAt" TIMESTAMPTZ,
    url TEXT,
    additions INTEGER DEFAULT 0,
    deletions INTEGER DEFAULT 0,
    "filesChanged" TEXT[] DEFAULT '{}',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devtel_github_commits_workspace_id 
ON "devtelGithubCommits"("workspaceId");

CREATE INDEX IF NOT EXISTS idx_devtel_github_commits_author 
ON "devtelGithubCommits"("authorEmail");

CREATE INDEX IF NOT EXISTS idx_devtel_github_commits_date 
ON "devtelGithubCommits"("committedAt" DESC);

CREATE INDEX IF NOT EXISTS idx_devtel_github_commits_repo 
ON "devtelGithubCommits"("repository");

-- ============================================
-- Integrations Indices
-- ============================================

CREATE INDEX IF NOT EXISTS idx_devtel_integrations_workspace_id 
ON "devtelIntegrations"("workspaceId");

CREATE INDEX IF NOT EXISTS idx_devtel_integrations_provider 
ON "devtelIntegrations"("provider");

CREATE INDEX IF NOT EXISTS idx_devtel_integrations_status 
ON "devtelIntegrations"("status");

-- ============================================
-- Performance Notes
-- ============================================

-- These indices will significantly improve query performance for:
-- 1. Board page: Filtering issues by status, project, assignee
-- 2. Backlog page: Listing and sorting issues
-- 3. Cycles page: Finding issues in specific cycles
-- 4. Search: Full-text search on issue titles and descriptions
-- 5. GitHub integration: Commit lookups and aggregations
--
-- Estimated improvement: 10-100x faster queries on large datasets (1000+ issues)
-- Trade-off: Slightly slower writes (inserts/updates), but negligible for this use case
