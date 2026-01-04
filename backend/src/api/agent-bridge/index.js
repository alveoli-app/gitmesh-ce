"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const errorMiddleware_1 = require("../../middlewares/errorMiddleware");
/**
 * Agent Bridge API Routes
 * Internal endpoints for Python CrewAI service to call DevSpace functionality
 * All endpoints require service token authentication
 */
exports.default = (app) => {
    // Middleware to validate service token
    const validateServiceToken = (req, res, next) => {
        const serviceToken = req.headers['x-service-token'];
        const expectedToken = process.env.CREWAI_SERVICE_TOKEN || 'dev-token';
        if (!serviceToken || serviceToken !== expectedToken) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid or missing service token'
            });
        }
        next();
    };
    // Apply to all agent-bridge routes
    app.use('/agent-bridge', validateServiceToken);
    // ============================================
    // Issue Tools
    // ============================================
    app.post(`/agent-bridge/issues/search`, (0, errorMiddleware_1.safeWrap)(require('./issuesBridge').searchIssues));
    app.post(`/agent-bridge/issues/get`, (0, errorMiddleware_1.safeWrap)(require('./issuesBridge').getIssue));
    app.post(`/agent-bridge/issues/create`, (0, errorMiddleware_1.safeWrap)(require('./issuesBridge').createIssue));
    app.post(`/agent-bridge/issues/update`, (0, errorMiddleware_1.safeWrap)(require('./issuesBridge').updateIssue));
    // ============================================
    // Cycle Tools
    // ============================================
    app.post(`/agent-bridge/cycles/list`, (0, errorMiddleware_1.safeWrap)(require('./cyclesBridge').listCycles));
    app.post(`/agent-bridge/cycles/get-active`, (0, errorMiddleware_1.safeWrap)(require('./cyclesBridge').getActiveCycle));
    app.post(`/agent-bridge/cycles/metrics`, (0, errorMiddleware_1.safeWrap)(require('./cyclesBridge').getCycleMetrics));
    // ============================================
    // Capacity Tools
    // ============================================
    app.post(`/agent-bridge/capacity/overview`, (0, errorMiddleware_1.safeWrap)(require('./capacityBridge').getCapacityOverview));
    app.post(`/agent-bridge/capacity/member-workload`, (0, errorMiddleware_1.safeWrap)(require('./capacityBridge').getMemberWorkload));
    app.post(`/agent-bridge/capacity/check-overallocation`, (0, errorMiddleware_1.safeWrap)(require('./capacityBridge').checkOverallocation));
    // ============================================
    // Spec Tools
    // ============================================
    app.post(`/agent-bridge/specs/list`, (0, errorMiddleware_1.safeWrap)(require('./specsBridge').listSpecs));
    app.post(`/agent-bridge/specs/create`, (0, errorMiddleware_1.safeWrap)(require('./specsBridge').createSpec));
    app.post(`/agent-bridge/specs/update`, (0, errorMiddleware_1.safeWrap)(require('./specsBridge').updateSpec));
    // ============================================
    // Team Tools
    // ============================================
    app.post(`/agent-bridge/team/list`, (0, errorMiddleware_1.safeWrap)(require('./teamBridge').listTeamMembers));
    app.post(`/agent-bridge/team/suggest-assignee`, (0, errorMiddleware_1.safeWrap)(require('./teamBridge').suggestAssignee));
    // ============================================
    // Project Tools
    // ============================================
    app.post(`/agent-bridge/projects/summary`, (0, errorMiddleware_1.safeWrap)(require('./projectsBridge').getProjectSummary));
    // ============================================
    // Git Tools
    // ============================================
    app.post(`/agent-bridge/git/commits`, (0, errorMiddleware_1.safeWrap)(require('./gitBridge').getRecentCommits));
    app.post(`/agent-bridge/git/prs`, (0, errorMiddleware_1.safeWrap)(require('./gitBridge').getRecentPRs));
    // ============================================
    // Proposal Tools
    // ============================================
    app.post(`/agent-bridge/proposals/create`, (0, errorMiddleware_1.safeWrap)(require('./proposalsBridge').createProposal));
};
//# sourceMappingURL=index.js.map