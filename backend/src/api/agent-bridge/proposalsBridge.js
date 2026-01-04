"use strict";
/**
 * Proposals Bridge
 * Exposes proposal creation for agents
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProposal = void 0;
const chatService_1 = __importDefault(require("../../services/chat/chatService"));
const createProposal = async (req, res) => {
    const { conversationId, agentId, actionType, parameters, reasoning, affectedEntities, confidenceScore } = req.body;
    if (!conversationId || !agentId || !actionType || !parameters) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        const chatService = new chatService_1.default(req);
        const proposal = await chatService.createProposal({
            conversationId,
            agentId,
            actionType,
            parameters,
            reasoning,
            affectedEntities,
            confidenceScore
        });
        // Log tool call
        await req.database.agentToolLogs.create({
            tenantId: req.currentUser.tenantId,
            agentName: agentId,
            toolName: 'create_proposal',
            parameters: req.body,
            success: true,
            durationMs: 0,
            conversationId
        });
        res.json({ data: proposal });
    }
    catch (error) {
        req.log.error('Failed to create proposal:', error);
        res.status(500).json({ error: 'Failed to create proposal' });
    }
};
exports.createProposal = createProposal;
//# sourceMappingURL=proposalsBridge.js.map