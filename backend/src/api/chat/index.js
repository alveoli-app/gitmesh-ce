"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const errorMiddleware_1 = require("../../middlewares/errorMiddleware");
/**
 * Chat API Routes
 * AI-powered command center for DevSpace
 */
exports.default = (app) => {
    // ============================================
    // Conversation Routes
    // ============================================
    // List conversations
    app.get(`/tenant/:tenantId/chat/conversations`, (0, errorMiddleware_1.safeWrap)(require('./conversationList').default));
    // Create conversation
    app.post(`/tenant/:tenantId/chat/conversations`, (0, errorMiddleware_1.safeWrap)(require('./conversationCreate').default));
    // Get single conversation with messages
    app.get(`/tenant/:tenantId/chat/conversations/:conversationId`, (0, errorMiddleware_1.safeWrap)(require('./conversationFind').default));
    // Update conversation (rename, context)
    app.put(`/tenant/:tenantId/chat/conversations/:conversationId`, (0, errorMiddleware_1.safeWrap)(require('./conversationUpdate').default));
    // Delete/archive conversation
    app.delete(`/tenant/:tenantId/chat/conversations/:conversationId`, (0, errorMiddleware_1.safeWrap)(require('./conversationDestroy').default));
    // ============================================
    // Message Routes
    // ============================================
    // Send message (triggers agent processing)
    app.post(`/tenant/:tenantId/chat/conversations/:conversationId/messages`, (0, errorMiddleware_1.safeWrap)(require('./messageCreate').default));
    // Get messages for conversation
    app.get(`/tenant/:tenantId/chat/conversations/:conversationId/messages`, (0, errorMiddleware_1.safeWrap)(require('./messageList').default));
    // SSE endpoint for streaming responses
    app.get(`/tenant/:tenantId/chat/conversations/:conversationId/stream`, (0, errorMiddleware_1.safeWrap)(require('./messageStream').default));
    // ============================================
    // Action Proposal Routes
    // ============================================
    // Get pending proposals for a conversation
    app.get(`/tenant/:tenantId/chat/conversations/:conversationId/proposals`, (0, errorMiddleware_1.safeWrap)(require('./proposalList').default));
    // Approve a proposal
    app.post(`/tenant/:tenantId/chat/proposals/:proposalId/approve`, (0, errorMiddleware_1.safeWrap)(require('./proposalApprove').default));
    // Reject a proposal
    app.post(`/tenant/:tenantId/chat/proposals/:proposalId/reject`, (0, errorMiddleware_1.safeWrap)(require('./proposalReject').default));
    // Modify a proposal (creates new proposal)
    app.post(`/tenant/:tenantId/chat/proposals/:proposalId/modify`, (0, errorMiddleware_1.safeWrap)(require('./proposalModify').default));
    // ============================================
    // Action History Routes
    // ============================================
    // List executed actions
    app.get(`/tenant/:tenantId/chat/actions`, (0, errorMiddleware_1.safeWrap)(require('./actionList').default));
    // Get action details
    app.get(`/tenant/:tenantId/chat/actions/:actionId`, (0, errorMiddleware_1.safeWrap)(require('./actionFind').default));
    // Revert an action
    app.post(`/tenant/:tenantId/chat/actions/:actionId/revert`, (0, errorMiddleware_1.safeWrap)(require('./actionRevert').default));
    // Analyze action impact
    app.get(`/tenant/:tenantId/chat/actions/:actionId/analyze`, (0, errorMiddleware_1.safeWrap)(require('./actionAnalyze').default));
    // ============================================
    // Compliance Routes
    // ============================================
    // List compliance exports
    app.get(`/tenant/:tenantId/chat/compliance/exports`, (0, errorMiddleware_1.safeWrap)(require('./complianceList').default));
    // Generate compliance export
    app.post(`/tenant/:tenantId/chat/compliance/generate`, (0, errorMiddleware_1.safeWrap)(require('./complianceCreate').default));
    // ============================================
    // Agent Routes
    // ============================================
    // Get agent status and configuration
    app.get(`/tenant/:tenantId/chat/agents`, (0, errorMiddleware_1.safeWrap)(require('./agentList').default));
    // Update agent configuration
    app.put(`/tenant/:tenantId/chat/agents/:agentId`, (0, errorMiddleware_1.safeWrap)(require('./agentUpdate').default));
    // Get agent telemetry
    app.get(`/tenant/:tenantId/chat/agents/telemetry`, (0, errorMiddleware_1.safeWrap)(require('./agentTelemetry').default));
    // ============================================
    // Insight Routes
    // ============================================
    // List insights
    app.get(`/tenant/:tenantId/chat/insights`, (0, errorMiddleware_1.safeWrap)(require('./insightList').default));
    // Update insight (dismiss, resolve, etc)
    app.put(`/tenant/:tenantId/chat/insights/:id`, (0, errorMiddleware_1.safeWrap)(require('./insightUpdate').default));
    // Insight Analytics
    app.get(`/tenant/:tenantId/chat/insights/analytics`, (0, errorMiddleware_1.safeWrap)(require('./insightAnalytics').default));
    // ============================================
    // Feedback Routes
    // ============================================
    // Submit feedback for a message
    app.post(`/tenant/:tenantId/chat/messages/:messageId/feedback`, (0, errorMiddleware_1.safeWrap)(require('./feedbackCreate').default));
    // Get feedback summary for agents
    app.get(`/tenant/:tenantId/chat/feedback/summary`, (0, errorMiddleware_1.safeWrap)(require('./feedbackSummary').default));
    // ============================================
    // CrewAI Telemetry Endpoint (internal)
    // ============================================
    app.post(`/api/telemetry/crewai`, (0, errorMiddleware_1.safeWrap)(require('./telemetryReceive').default));
};
//# sourceMappingURL=index.js.map