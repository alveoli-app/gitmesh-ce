import { safeWrap } from '../../middlewares/errorMiddleware'

/**
 * DevTel API Routes
 * Project management features with AI integration
 */
export default (app) => {
    // ============================================
    // Health Check Route
    // ============================================
    try {
        app.get(
            `/tenant/:tenantId/devtel/health`,
            safeWrap(require('./health/healthCheck').default),
        )
    } catch (err) {
        console.error('[DevTel] Failed to load health check route:', err?.message)
    }

    // ============================================
    // Workspace Routes
    // ============================================
    app.get(
        `/tenant/:tenantId/devtel/workspace`,
        safeWrap(require('./workspaces/workspaceGet').default),
    )
    app.put(
        `/tenant/:tenantId/devtel/workspace`,
        safeWrap(require('./workspaces/workspaceUpdate').default),
    )

    // ============================================
    // Project Routes
    // ============================================
    app.get(
        `/tenant/:tenantId/devtel/projects`,
        safeWrap(require('./projects/projectList').default),
    )
    app.post(
        `/tenant/:tenantId/devtel/projects`,
        safeWrap(require('./projects/projectCreate').default),
    )
    app.get(
        `/tenant/:tenantId/devtel/projects/:projectId`,
        safeWrap(require('./projects/projectFind').default),
    )
    app.put(
        `/tenant/:tenantId/devtel/projects/:projectId`,
        safeWrap(require('./projects/projectUpdate').default),
    )
    app.delete(
        `/tenant/:tenantId/devtel/projects/:projectId`,
        safeWrap(require('./projects/projectDestroy').default),
    )

    // ============================================
    // Sync Routes
    // ============================================
    try {
        app.post(
            `/tenant/:tenantId/devtel/projects/:projectId/sync/trigger`,
            safeWrap(require('./sync/syncTrigger').default),
        )
        console.log('[DevTel] Successfully registered sync/trigger route')
    } catch (err) {
        console.error('[DevTel] Failed to register sync/trigger route:', err?.message, err?.stack)
    }
    
    try {
        app.get(
            `/tenant/:tenantId/devtel/projects/:projectId/sync/conflicts`,
            safeWrap(require('./sync/conflictList').default),
        )
    } catch (err) {
        console.error('[DevTel] Failed to register sync/conflicts route:', err?.message)
    }
    
    try {
        app.post(
            `/tenant/:tenantId/devtel/projects/:projectId/sync/conflicts/:conflictId/resolve`,
            safeWrap(require('./sync/conflictResolve').default),
        )
    } catch (err) {
        console.error('[DevTel] Failed to register conflict/resolve route:', err?.message)
    }
    app.get(
        `/tenant/:tenantId/devtel/projects/:projectId/overview`,
        safeWrap(require('./projects/projectOverview').default),
    )

    // ============================================
    // Issue Routes
    // ============================================
    console.log('[DevTel] Registering issue routes...')
    app.get(
        `/tenant/:tenantId/devtel/projects/:projectId/issues`,
        safeWrap(require('./issues/issueList').default),
    )
    app.post(
        `/tenant/:tenantId/devtel/projects/:projectId/issues`,
        safeWrap(require('./issues/issueCreate').default),
    )
    console.log('[DevTel] Issue POST route registered at /tenant/:tenantId/devtel/projects/:projectId/issues')
    app.get(
        `/tenant/:tenantId/devtel/projects/:projectId/issues/:issueId`,
        safeWrap(require('./issues/issueFind').default),
    )
    app.put(
        `/tenant/:tenantId/devtel/projects/:projectId/issues/:issueId`,
        safeWrap(require('./issues/issueUpdate').default),
    )
    app.delete(
        `/tenant/:tenantId/devtel/projects/:projectId/issues/:issueId`,
        safeWrap(require('./issues/issueDestroy').default),
    )
    app.patch(
        `/tenant/:tenantId/devtel/projects/:projectId/issues/bulk`,
        safeWrap(require('./issues/issueBulkUpdate').default),
    )
    app.post(
        `/tenant/:tenantId/devtel/projects/:projectId/issues/search`,
        safeWrap(require('./issues/issueSearch').default),
    )
    app.post(
        `/tenant/:tenantId/devtel/projects/:projectId/issues/:issueId/comments`,
        safeWrap(require('./issues/issueCommentCreate').default),
    )
    app.get(
        `/tenant/:tenantId/devtel/projects/:projectId/issues/:issueId/comments`,
        safeWrap(require('./issues/issueCommentList').default),
    )
    app.get(
        `/tenant/:tenantId/devtel/issues/:issueId/external-links`,
        safeWrap(require('./issues/issueExternalLinks').default),
    )

    // ============================================
    // Cycle Routes
    // ============================================
    app.get(
        `/tenant/:tenantId/devtel/projects/:projectId/cycles`,
        safeWrap(require('./cycles/cycleList').default),
    )
    app.get(
        `/tenant/:tenantId/devtel/projects/:projectId/cycles/archived`,
        safeWrap(require('./cycles/cycleArchiveList').default),
    )
    app.post(
        `/tenant/:tenantId/devtel/projects/:projectId/cycles`,
        safeWrap(require('./cycles/cycleCreate').default),
    )
    app.get(
        `/tenant/:tenantId/devtel/projects/:projectId/cycles/:cycleId`,
        safeWrap(require('./cycles/cycleFind').default),
    )
    app.put(
        `/tenant/:tenantId/devtel/projects/:projectId/cycles/:cycleId`,
        safeWrap(require('./cycles/cycleUpdate').default),
    )
    app.delete(
        `/tenant/:tenantId/devtel/projects/:projectId/cycles/:cycleId`,
        safeWrap(require('./cycles/cycleDestroy').default),
    )
    app.post(
        `/tenant/:tenantId/devtel/projects/:projectId/cycles/:cycleId/restore`,
        safeWrap(require('./cycles/cycleRestore').default),
    )
    app.delete(
        `/tenant/:tenantId/devtel/projects/:projectId/cycles/:cycleId/permanent`,
        safeWrap(require('./cycles/cyclePermanentDelete').default),
    )
    app.get(
        `/tenant/:tenantId/devtel/projects/:projectId/cycles/:cycleId/burndown`,
        safeWrap(require('./cycles/cycleBurndown').default),
    )
    app.post(
        `/tenant/:tenantId/devtel/projects/:projectId/cycles/:cycleId/plan`,
        safeWrap(require('./cycles/cyclePlan').default),
    )
    app.post(
        `/tenant/:tenantId/devtel/projects/:projectId/cycles/:cycleId/start`,
        safeWrap(require('./cycles/cycleStart').default),
    )
    app.post(
        `/tenant/:tenantId/devtel/projects/:projectId/cycles/:cycleId/complete`,
        safeWrap(require('./cycles/cycleComplete').default),
    )
    app.post(
        `/tenant/:tenantId/devtel/projects/:projectId/cycles/:cycleId/move-incomplete`,
        safeWrap(require('./cycles/cycleMoveIncomplete').default),
    )

    // ============================================
    // Capacity Routes
    // ============================================
    app.get(
        `/tenant/:tenantId/devtel/capacity`,
        safeWrap(require('./capacity/capacityOverview').default),
    )
    app.get(
        `/tenant/:tenantId/devtel/capacity/timeline`,
        safeWrap(require('./capacity/capacityTimeline').default),
    )
    app.put(
        `/tenant/:tenantId/devtel/capacity/assignments/:assignmentId`,
        safeWrap(require('./capacity/assignmentUpdate').default),
    )
    app.get(
        `/tenant/:tenantId/devtel/projects/:projectId/capacity/contributions`,
        safeWrap(require('./capacity/contributionActivity').default),
    )

    // ============================================
    // Spec Routes
    // ============================================
    app.get(
        `/tenant/:tenantId/devtel/projects/:projectId/specs`,
        safeWrap(require('./specs/specList').default),
    )
    app.post(
        `/tenant/:tenantId/devtel/projects/:projectId/specs`,
        safeWrap(require('./specs/specCreate').default),
    )
    app.get(
        `/tenant/:tenantId/devtel/projects/:projectId/specs/:specId`,
        safeWrap(require('./specs/specFind').default),
    )
    app.put(
        `/tenant/:tenantId/devtel/projects/:projectId/specs/:specId`,
        safeWrap(require('./specs/specUpdate').default),
    )
    app.delete(
        `/tenant/:tenantId/devtel/projects/:projectId/specs/:specId`,
        safeWrap(require('./specs/specDestroy').default),
    )
    app.get(
        `/tenant/:tenantId/devtel/projects/:projectId/specs/:specId/versions`,
        safeWrap(require('./specs/specVersionList').default),
    )
    app.post(
        `/tenant/:tenantId/devtel/projects/:projectId/specs/:specId/comments`,
        safeWrap(require('./specs/specCommentCreate').default),
    )
    app.post(
        `/tenant/:tenantId/devtel/projects/:projectId/specs/search`,
        safeWrap(require('./specs/specSearch').default),
    )

    // ============================================
    // Team Routes
    // ============================================
    app.get(
        `/tenant/:tenantId/devtel/team`,
        safeWrap(require('./team/teamList').default),
    )
    // Analytics route must come before :userId routes to avoid matching "analytics" as a userId
    app.get(
        `/tenant/:tenantId/devtel/team/analytics`,
        safeWrap(require('./team/teamAnalytics').default),
    )
    app.get(
        `/tenant/:tenantId/devtel/team/:userId`,
        safeWrap(require('./team/teamMemberFind').default),
    )
    app.put(
        `/tenant/:tenantId/devtel/team/:userId`,
        safeWrap(require('./team/teamMemberUpdate').default),
    )
    app.post(
        `/tenant/:tenantId/devtel/team/:userId/skills`,
        safeWrap(require('./team/skillCreate').default),
    )
    app.delete(
        `/tenant/:tenantId/devtel/team/:userId/skills/:skillId`,
        safeWrap(require('./team/skillDestroy').default),
    )

    // ============================================
    // Settings Routes
    // ============================================
    app.get(
        `/tenant/:tenantId/devtel/settings`,
        safeWrap(require('./settings/settingsGet').default),
    )
    app.put(
        `/tenant/:tenantId/devtel/settings`,
        safeWrap(require('./settings/settingsUpdate').default),
    )
    app.get(
        `/tenant/:tenantId/devtel/settings/integrations`,
        safeWrap(require('./settings/integrationList').default),
    )
    app.post(
        `/tenant/:tenantId/devtel/settings/integrations`,
        safeWrap(require('./settings/integrationCreate').default),
    )
    app.put(
        `/tenant/:tenantId/devtel/settings/integrations/:integrationId`,
        safeWrap(require('./settings/integrationUpdate').default),
    )
    app.delete(
        `/tenant/:tenantId/devtel/settings/integrations/:integrationId`,
        safeWrap(require('./settings/integrationDestroy').default),
    )
    app.post(
        `/tenant/:tenantId/devtel/settings/integrations/:integrationId/test`,
        safeWrap(require('./settings/integrationTest').default),
    )
    app.get(
        `/tenant/:tenantId/devtel/settings/webhooks`,
        safeWrap(require('./settings/webhookList').default),
    )
    app.post(
        `/tenant/:tenantId/devtel/settings/webhooks`,
        safeWrap(require('./settings/webhookCreate').default),
    )
    app.put(
        `/tenant/:tenantId/devtel/settings/webhooks/:webhookId`,
        safeWrap(require('./settings/webhookUpdate').default),
    )
    app.delete(
        `/tenant/:tenantId/devtel/settings/webhooks/:webhookId`,
        safeWrap(require('./settings/webhookDestroy').default),
    )

    // GitHub webhook receiver (public endpoint)
    app.post(
        `/webhook/devtel/github/:workspaceId`,
        safeWrap(require('./webhooks/githubWebhook').default),
    )

    // Manual sync trigger for integrations
    app.post(
        `/tenant/:tenantId/devtel/settings/integrations/:integrationId/sync`,
        safeWrap(require('./settings/integrationSync').default),
    )

    app.get(
        `/tenant/:tenantId/devtel/settings/agents`,
        safeWrap(require('./settings/agentSettingsGet').default),
    )
    app.put(
        `/tenant/:tenantId/devtel/settings/agents`,
        safeWrap(require('./settings/agentSettingsUpdate').default),
    )

    // ============================================
    // Agent Bridge Routes (for CrewAI callbacks)
    // ============================================
    /*
    app.post(
        `/tenant/:tenantId/devtel/agent-bridge/issues`,
        safeWrap(require('./agent-bridge/bridgeIssues').default),
    )
    app.post(
        `/tenant/:tenantId/devtel/agent-bridge/capacity`,
        safeWrap(require('./agent-bridge/bridgeCapacity').default),
    )
    app.post(
        `/tenant/:tenantId/devtel/agent-bridge/specs`,
        safeWrap(require('./agent-bridge/bridgeSpecs').default),
    )
    */

    // ============================================
    // AI Workflow Trigger Routes
    // ============================================
    app.post(
        `/tenant/:tenantId/devtel/ai/prioritize-issues`,
        safeWrap(require('./ai/prioritizeIssues').default),
    )
    app.post(
        `/tenant/:tenantId/devtel/ai/suggest-sprint`,
        safeWrap(require('./ai/suggestSprint').default),
    )
    app.post(
        `/tenant/:tenantId/devtel/ai/breakdown-issue`,
        safeWrap(require('./ai/breakdownIssue').default),
    )
    app.post(
        `/tenant/:tenantId/devtel/ai/generate-spec`,
        safeWrap(require('./ai/generateSpec').default),
    )
    /*
    app.post(
        `/tenant/:tenantId/devtel/ai/balance-workload`,
        safeWrap(require('./ai/balanceWorkload').default),
    )
    */
    app.post(
        `/tenant/:tenantId/devtel/ai/suggest-assignee`,
        safeWrap(require('./ai/suggestAssignee').default),
    )
    /*
    app.post(
        `/tenant/:tenantId/devtel/ai/analyze-cycle-health`,
        safeWrap(require('./ai/analyzeCycleHealth').default),
    )
    */

    // ============================================
    // Saved Filters
    // ============================================
    app.get(
        `/tenant/:tenantId/devtel/filters`,
        safeWrap(require('./filters/filterList').default),
    )
    app.post(
        `/tenant/:tenantId/devtel/filters`,
        safeWrap(require('./filters/filterCreate').default),
    )
    app.delete(
        `/tenant/:tenantId/devtel/filters/:filterId`,
        safeWrap(require('./filters/filterDestroy').default),
    )
}
