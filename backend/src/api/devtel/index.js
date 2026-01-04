"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const errorMiddleware_1 = require("../../middlewares/errorMiddleware");
/**
 * DevTel API Routes
 * Project management features with AI integration
 */
exports.default = (app) => {
    // ============================================
    // Health Check Route
    // ============================================
    app.get(`/tenant/:tenantId/devtel/health`, (0, errorMiddleware_1.safeWrap)(require('./health/healthCheck').default));
    // ============================================
    // Workspace Routes
    // ============================================
    app.get(`/tenant/:tenantId/devtel/workspace`, (0, errorMiddleware_1.safeWrap)(require('./workspaces/workspaceGet').default));
    app.put(`/tenant/:tenantId/devtel/workspace`, (0, errorMiddleware_1.safeWrap)(require('./workspaces/workspaceUpdate').default));
    // ============================================
    // Project Routes
    // ============================================
    app.get(`/tenant/:tenantId/devtel/projects`, (0, errorMiddleware_1.safeWrap)(require('./projects/projectList').default));
    app.post(`/tenant/:tenantId/devtel/projects`, (0, errorMiddleware_1.safeWrap)(require('./projects/projectCreate').default));
    app.get(`/tenant/:tenantId/devtel/projects/:projectId`, (0, errorMiddleware_1.safeWrap)(require('./projects/projectFind').default));
    app.put(`/tenant/:tenantId/devtel/projects/:projectId`, (0, errorMiddleware_1.safeWrap)(require('./projects/projectUpdate').default));
    app.delete(`/tenant/:tenantId/devtel/projects/:projectId`, (0, errorMiddleware_1.safeWrap)(require('./projects/projectDestroy').default));
    // ============================================
    // Issue Routes
    // ============================================
    app.get(`/tenant/:tenantId/devtel/projects/:projectId/issues`, (0, errorMiddleware_1.safeWrap)(require('./issues/issueList').default));
    app.post(`/tenant/:tenantId/devtel/projects/:projectId/issues`, (0, errorMiddleware_1.safeWrap)(require('./issues/issueCreate').default));
    app.get(`/tenant/:tenantId/devtel/projects/:projectId/issues/:issueId`, (0, errorMiddleware_1.safeWrap)(require('./issues/issueFind').default));
    app.put(`/tenant/:tenantId/devtel/projects/:projectId/issues/:issueId`, (0, errorMiddleware_1.safeWrap)(require('./issues/issueUpdate').default));
    app.delete(`/tenant/:tenantId/devtel/projects/:projectId/issues/:issueId`, (0, errorMiddleware_1.safeWrap)(require('./issues/issueDestroy').default));
    app.patch(`/tenant/:tenantId/devtel/projects/:projectId/issues/bulk`, (0, errorMiddleware_1.safeWrap)(require('./issues/issueBulkUpdate').default));
    app.post(`/tenant/:tenantId/devtel/projects/:projectId/issues/search`, (0, errorMiddleware_1.safeWrap)(require('./issues/issueSearch').default));
    app.post(`/tenant/:tenantId/devtel/projects/:projectId/issues/:issueId/comments`, (0, errorMiddleware_1.safeWrap)(require('./issues/issueCommentCreate').default));
    app.get(`/tenant/:tenantId/devtel/projects/:projectId/issues/:issueId/comments`, (0, errorMiddleware_1.safeWrap)(require('./issues/issueCommentList').default));
    app.get(`/tenant/:tenantId/devtel/issues/:issueId/external-links`, (0, errorMiddleware_1.safeWrap)(require('./issues/issueExternalLinks').default));
    // ============================================
    // Cycle Routes
    // ============================================
    app.get(`/tenant/:tenantId/devtel/projects/:projectId/cycles`, (0, errorMiddleware_1.safeWrap)(require('./cycles/cycleList').default));
    app.post(`/tenant/:tenantId/devtel/projects/:projectId/cycles`, (0, errorMiddleware_1.safeWrap)(require('./cycles/cycleCreate').default));
    app.get(`/tenant/:tenantId/devtel/projects/:projectId/cycles/:cycleId`, (0, errorMiddleware_1.safeWrap)(require('./cycles/cycleFind').default));
    app.put(`/tenant/:tenantId/devtel/projects/:projectId/cycles/:cycleId`, (0, errorMiddleware_1.safeWrap)(require('./cycles/cycleUpdate').default));
    app.delete(`/tenant/:tenantId/devtel/projects/:projectId/cycles/:cycleId`, (0, errorMiddleware_1.safeWrap)(require('./cycles/cycleDestroy').default));
    app.get(`/tenant/:tenantId/devtel/projects/:projectId/cycles/:cycleId/burndown`, (0, errorMiddleware_1.safeWrap)(require('./cycles/cycleBurndown').default));
    app.post(`/tenant/:tenantId/devtel/projects/:projectId/cycles/:cycleId/plan`, (0, errorMiddleware_1.safeWrap)(require('./cycles/cyclePlan').default));
    app.post(`/tenant/:tenantId/devtel/projects/:projectId/cycles/:cycleId/start`, (0, errorMiddleware_1.safeWrap)(require('./cycles/cycleStart').default));
    app.post(`/tenant/:tenantId/devtel/projects/:projectId/cycles/:cycleId/complete`, (0, errorMiddleware_1.safeWrap)(require('./cycles/cycleComplete').default));
    // ============================================
    // Capacity Routes
    // ============================================
    app.get(`/tenant/:tenantId/devtel/capacity`, (0, errorMiddleware_1.safeWrap)(require('./capacity/capacityOverview').default));
    app.get(`/tenant/:tenantId/devtel/capacity/timeline`, (0, errorMiddleware_1.safeWrap)(require('./capacity/capacityTimeline').default));
    app.put(`/tenant/:tenantId/devtel/capacity/assignments/:assignmentId`, (0, errorMiddleware_1.safeWrap)(require('./capacity/assignmentUpdate').default));
    // ============================================
    // Spec Routes
    // ============================================
    app.get(`/tenant/:tenantId/devtel/projects/:projectId/specs`, (0, errorMiddleware_1.safeWrap)(require('./specs/specList').default));
    app.post(`/tenant/:tenantId/devtel/projects/:projectId/specs`, (0, errorMiddleware_1.safeWrap)(require('./specs/specCreate').default));
    app.get(`/tenant/:tenantId/devtel/projects/:projectId/specs/:specId`, (0, errorMiddleware_1.safeWrap)(require('./specs/specFind').default));
    app.put(`/tenant/:tenantId/devtel/projects/:projectId/specs/:specId`, (0, errorMiddleware_1.safeWrap)(require('./specs/specUpdate').default));
    app.delete(`/tenant/:tenantId/devtel/projects/:projectId/specs/:specId`, (0, errorMiddleware_1.safeWrap)(require('./specs/specDestroy').default));
    app.get(`/tenant/:tenantId/devtel/projects/:projectId/specs/:specId/versions`, (0, errorMiddleware_1.safeWrap)(require('./specs/specVersionList').default));
    app.post(`/tenant/:tenantId/devtel/projects/:projectId/specs/:specId/comments`, (0, errorMiddleware_1.safeWrap)(require('./specs/specCommentCreate').default));
    app.post(`/tenant/:tenantId/devtel/projects/:projectId/specs/search`, (0, errorMiddleware_1.safeWrap)(require('./specs/specSearch').default));
    // ============================================
    // Team Routes
    // ============================================
    app.get(`/tenant/:tenantId/devtel/team`, (0, errorMiddleware_1.safeWrap)(require('./team/teamList').default));
    // Analytics route must come before :userId routes to avoid matching "analytics" as a userId
    app.get(`/tenant/:tenantId/devtel/team/analytics`, (0, errorMiddleware_1.safeWrap)(require('./team/teamAnalytics').default));
    app.get(`/tenant/:tenantId/devtel/team/:userId`, (0, errorMiddleware_1.safeWrap)(require('./team/teamMemberFind').default));
    app.put(`/tenant/:tenantId/devtel/team/:userId`, (0, errorMiddleware_1.safeWrap)(require('./team/teamMemberUpdate').default));
    app.post(`/tenant/:tenantId/devtel/team/:userId/skills`, (0, errorMiddleware_1.safeWrap)(require('./team/skillCreate').default));
    app.delete(`/tenant/:tenantId/devtel/team/:userId/skills/:skillId`, (0, errorMiddleware_1.safeWrap)(require('./team/skillDestroy').default));
    // ============================================
    // Settings Routes
    // ============================================
    app.get(`/tenant/:tenantId/devtel/settings`, (0, errorMiddleware_1.safeWrap)(require('./settings/settingsGet').default));
    app.put(`/tenant/:tenantId/devtel/settings`, (0, errorMiddleware_1.safeWrap)(require('./settings/settingsUpdate').default));
    app.get(`/tenant/:tenantId/devtel/settings/integrations`, (0, errorMiddleware_1.safeWrap)(require('./settings/integrationList').default));
    app.post(`/tenant/:tenantId/devtel/settings/integrations`, (0, errorMiddleware_1.safeWrap)(require('./settings/integrationCreate').default));
    app.delete(`/tenant/:tenantId/devtel/settings/integrations/:integrationId`, (0, errorMiddleware_1.safeWrap)(require('./settings/integrationDestroy').default));
    app.post(`/tenant/:tenantId/devtel/settings/integrations/:integrationId/test`, (0, errorMiddleware_1.safeWrap)(require('./settings/integrationTest').default));
    app.get(`/tenant/:tenantId/devtel/settings/webhooks`, (0, errorMiddleware_1.safeWrap)(require('./settings/webhookList').default));
    app.post(`/tenant/:tenantId/devtel/settings/webhooks`, (0, errorMiddleware_1.safeWrap)(require('./settings/webhookCreate').default));
    app.put(`/tenant/:tenantId/devtel/settings/webhooks/:webhookId`, (0, errorMiddleware_1.safeWrap)(require('./settings/webhookUpdate').default));
    app.delete(`/tenant/:tenantId/devtel/settings/webhooks/:webhookId`, (0, errorMiddleware_1.safeWrap)(require('./settings/webhookDestroy').default));
    // GitHub webhook receiver (public endpoint)
    app.post(`/webhook/devtel/github/:workspaceId`, (0, errorMiddleware_1.safeWrap)(require('./webhooks/githubWebhook').default));
    // Manual sync trigger for integrations
    app.post(`/tenant/:tenantId/devtel/settings/integrations/:integrationId/sync`, (0, errorMiddleware_1.safeWrap)(require('./settings/integrationSync').default));
    app.get(`/tenant/:tenantId/devtel/settings/agents`, (0, errorMiddleware_1.safeWrap)(require('./settings/agentSettingsGet').default));
    app.put(`/tenant/:tenantId/devtel/settings/agents`, (0, errorMiddleware_1.safeWrap)(require('./settings/agentSettingsUpdate').default));
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
    app.post(`/tenant/:tenantId/devtel/ai/prioritize-issues`, (0, errorMiddleware_1.safeWrap)(require('./ai/prioritizeIssues').default));
    app.post(`/tenant/:tenantId/devtel/ai/suggest-sprint`, (0, errorMiddleware_1.safeWrap)(require('./ai/suggestSprint').default));
    app.post(`/tenant/:tenantId/devtel/ai/breakdown-issue`, (0, errorMiddleware_1.safeWrap)(require('./ai/breakdownIssue').default));
    app.post(`/tenant/:tenantId/devtel/ai/generate-spec`, (0, errorMiddleware_1.safeWrap)(require('./ai/generateSpec').default));
    /*
    app.post(
        `/tenant/:tenantId/devtel/ai/balance-workload`,
        safeWrap(require('./ai/balanceWorkload').default),
    )
    */
    app.post(`/tenant/:tenantId/devtel/ai/suggest-assignee`, (0, errorMiddleware_1.safeWrap)(require('./ai/suggestAssignee').default));
    /*
    app.post(
        `/tenant/:tenantId/devtel/ai/analyze-cycle-health`,
        safeWrap(require('./ai/analyzeCycleHealth').default),
    )
    */
    // ============================================
    // Saved Filters
    // ============================================
    app.get(`/tenant/:tenantId/devtel/filters`, (0, errorMiddleware_1.safeWrap)(require('./filters/filterList').default));
    app.post(`/tenant/:tenantId/devtel/filters`, (0, errorMiddleware_1.safeWrap)(require('./filters/filterCreate').default));
    app.delete(`/tenant/:tenantId/devtel/filters/:filterId`, (0, errorMiddleware_1.safeWrap)(require('./filters/filterDestroy').default));
};
//# sourceMappingURL=index.js.map