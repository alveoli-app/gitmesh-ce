import { safeWrap } from '../../middlewares/errorMiddleware'

/**
 * Agent Bridge API Routes
 * Internal endpoints for Python CrewAI service to call DevSpace functionality
 * All endpoints require service token authentication
 */
export default (app) => {
    // Middleware to validate service token
    const validateServiceToken = (req, res, next) => {
        const serviceToken = req.headers['x-service-token']
        const expectedToken = process.env.CREWAI_SERVICE_TOKEN || 'dev-token'

        if (!serviceToken || serviceToken !== expectedToken) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid or missing service token'
            })
        }
        next()
    }

    // Apply to all agent-bridge routes
    app.use('/agent-bridge', validateServiceToken)

    // ============================================
    // Issue Tools
    // ============================================

    app.post(
        `/agent-bridge/issues/search`,
        safeWrap(require('./issuesBridge').searchIssues),
    )

    app.post(
        `/agent-bridge/issues/get`,
        safeWrap(require('./issuesBridge').getIssue),
    )

    app.post(
        `/agent-bridge/issues/create`,
        safeWrap(require('./issuesBridge').createIssue),
    )

    app.post(
        `/agent-bridge/issues/update`,
        safeWrap(require('./issuesBridge').updateIssue),
    )

    // ============================================
    // Cycle Tools
    // ============================================

    app.post(
        `/agent-bridge/cycles/list`,
        safeWrap(require('./cyclesBridge').listCycles),
    )

    app.post(
        `/agent-bridge/cycles/get-active`,
        safeWrap(require('./cyclesBridge').getActiveCycle),
    )

    app.post(
        `/agent-bridge/cycles/metrics`,
        safeWrap(require('./cyclesBridge').getCycleMetrics),
    )

    // ============================================
    // Capacity Tools
    // ============================================

    app.post(
        `/agent-bridge/capacity/overview`,
        safeWrap(require('./capacityBridge').getCapacityOverview),
    )

    app.post(
        `/agent-bridge/capacity/member-workload`,
        safeWrap(require('./capacityBridge').getMemberWorkload),
    )

    app.post(
        `/agent-bridge/capacity/check-overallocation`,
        safeWrap(require('./capacityBridge').checkOverallocation),
    )

    // ============================================
    // Spec Tools
    // ============================================

    app.post(
        `/agent-bridge/specs/list`,
        safeWrap(require('./specsBridge').listSpecs),
    )

    app.post(
        `/agent-bridge/specs/create`,
        safeWrap(require('./specsBridge').createSpec),
    )

    app.post(
        `/agent-bridge/specs/update`,
        safeWrap(require('./specsBridge').updateSpec),
    )

    // ============================================
    // Team Tools
    // ============================================

    app.post(
        `/agent-bridge/team/list`,
        safeWrap(require('./teamBridge').listTeamMembers),
    )

    app.post(
        `/agent-bridge/team/suggest-assignee`,
        safeWrap(require('./teamBridge').suggestAssignee),
    )

    // ============================================
    // Project Tools
    // ============================================

    app.post(
        `/agent-bridge/projects/summary`,
        safeWrap(require('./projectsBridge').getProjectSummary),
    )

    // ============================================
    // Git Tools
    // ============================================

    app.post(
        `/agent-bridge/git/commits`,
        safeWrap(require('./gitBridge').getRecentCommits),
    )

    app.post(
        `/agent-bridge/git/prs`,
        safeWrap(require('./gitBridge').getRecentPRs),
    )

    // ============================================
    // Proposal Tools
    // ============================================

    app.post(
        `/agent-bridge/proposals/create`,
        safeWrap(require('./proposalsBridge').createProposal),
    )
}
