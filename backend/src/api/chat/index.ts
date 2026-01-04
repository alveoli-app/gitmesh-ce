import { safeWrap } from '../../middlewares/errorMiddleware'

/**
 * Chat API Routes
 * AI-powered command center for DevSpace
 */
export default (app) => {
    // ============================================
    // Conversation Routes
    // ============================================

    // List conversations
    app.get(
        `/tenant/:tenantId/chat/conversations`,
        safeWrap(require('./conversationList').default),
    )

    // Create conversation
    app.post(
        `/tenant/:tenantId/chat/conversations`,
        safeWrap(require('./conversationCreate').default),
    )

    // Get single conversation with messages
    app.get(
        `/tenant/:tenantId/chat/conversations/:conversationId`,
        safeWrap(require('./conversationFind').default),
    )

    // Update conversation (rename, context)
    app.put(
        `/tenant/:tenantId/chat/conversations/:conversationId`,
        safeWrap(require('./conversationUpdate').default),
    )

    // Delete/archive conversation
    app.delete(
        `/tenant/:tenantId/chat/conversations/:conversationId`,
        safeWrap(require('./conversationDestroy').default),
    )

    // ============================================
    // Message Routes
    // ============================================

    // Send message (triggers agent processing)
    app.post(
        `/tenant/:tenantId/chat/conversations/:conversationId/messages`,
        safeWrap(require('./messageCreate').default),
    )

    // Get messages for conversation
    app.get(
        `/tenant/:tenantId/chat/conversations/:conversationId/messages`,
        safeWrap(require('./messageList').default),
    )

    // SSE endpoint for streaming responses
    app.get(
        `/tenant/:tenantId/chat/conversations/:conversationId/stream`,
        safeWrap(require('./messageStream').default),
    )

    // ============================================
    // Action Proposal Routes
    // ============================================

    // Get pending proposals for a conversation
    app.get(
        `/tenant/:tenantId/chat/conversations/:conversationId/proposals`,
        safeWrap(require('./proposalList').default),
    )

    // Approve a proposal
    app.post(
        `/tenant/:tenantId/chat/proposals/:proposalId/approve`,
        safeWrap(require('./proposalApprove').default),
    )

    // Reject a proposal
    app.post(
        `/tenant/:tenantId/chat/proposals/:proposalId/reject`,
        safeWrap(require('./proposalReject').default),
    )

    // Modify a proposal (creates new proposal)
    app.post(
        `/tenant/:tenantId/chat/proposals/:proposalId/modify`,
        safeWrap(require('./proposalModify').default),
    )

    // ============================================
    // Action History Routes
    // ============================================

    // List executed actions
    app.get(
        `/tenant/:tenantId/chat/actions`,
        safeWrap(require('./actionList').default),
    )

    // Get action details
    app.get(
        `/tenant/:tenantId/chat/actions/:actionId`,
        safeWrap(require('./actionFind').default),
    )

    // Revert an action
    app.post(
        `/tenant/:tenantId/chat/actions/:actionId/revert`,
        safeWrap(require('./actionRevert').default),
    )

    // Analyze action impact
    app.get(
        `/tenant/:tenantId/chat/actions/:actionId/analyze`,
        safeWrap(require('./actionAnalyze').default),
    )

    // ============================================
    // Compliance Routes
    // ============================================

    // List compliance exports
    app.get(
        `/tenant/:tenantId/chat/compliance/exports`,
        safeWrap(require('./complianceList').default),
    )

    // Generate compliance export
    app.post(
        `/tenant/:tenantId/chat/compliance/generate`,
        safeWrap(require('./complianceCreate').default),
    )

    // ============================================
    // Agent Routes
    // ============================================

    // Get agent status and configuration
    app.get(
        `/tenant/:tenantId/chat/agents`,
        safeWrap(require('./agentList').default),
    )

    // Update agent configuration
    app.put(
        `/tenant/:tenantId/chat/agents/:agentId`,
        safeWrap(require('./agentUpdate').default),
    )

    // Get agent telemetry
    app.get(
        `/tenant/:tenantId/chat/agents/telemetry`,
        safeWrap(require('./agentTelemetry').default),
    )

    // ============================================
    // Insight Routes
    // ============================================

    // List insights
    app.get(
        `/tenant/:tenantId/chat/insights`,
        safeWrap(require('./insightList').default),
    )

    // Update insight (dismiss, resolve, etc)
    app.put(
        `/tenant/:tenantId/chat/insights/:id`,
        safeWrap(require('./insightUpdate').default),
    )

    // Insight Analytics
    app.get(
        `/tenant/:tenantId/chat/insights/analytics`,
        safeWrap(require('./insightAnalytics').default),
    )

    // ============================================
    // Feedback Routes
    // ============================================

    // Submit feedback for a message
    app.post(
        `/tenant/:tenantId/chat/messages/:messageId/feedback`,
        safeWrap(require('./feedbackCreate').default),
    )

    // Get feedback summary for agents
    app.get(
        `/tenant/:tenantId/chat/feedback/summary`,
        safeWrap(require('./feedbackSummary').default),
    )

    // ============================================
    // CrewAI Telemetry Endpoint (internal)
    // ============================================
    app.post(
        `/api/telemetry/crewai`,
        safeWrap(require('./telemetryReceive').default),
    )
}
