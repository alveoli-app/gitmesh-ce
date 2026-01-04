"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../security/permissions"));
/**
 * Modify a proposal (creates a new modified proposal)
 */
exports.default = async (req, res) => {
    const payload = new permissions_1.default(req.currentUser, req.currentTenant).edit;
    const { proposalId } = req.params;
    // Find original proposal
    const originalProposal = await req.database.chatActionProposals.findOne({
        where: {
            id: proposalId,
            status: 'pending',
        },
    });
    if (!originalProposal) {
        return res.status(404).json({ error: 'Proposal not found or already processed' });
    }
    // Verify user has access
    const conversation = await req.database.chatConversations.findOne({
        where: {
            id: originalProposal.conversationId,
            userId: req.currentUser.id,
        },
    });
    if (!conversation) {
        return res.status(403).json({ error: 'Access denied' });
    }
    // Mark original as modified
    await originalProposal.update({
        status: 'modified',
        respondedAt: new Date(),
        respondedBy: req.currentUser.id,
    });
    // Create new proposal with modified parameters
    const newProposal = await req.database.chatActionProposals.create({
        conversationId: originalProposal.conversationId,
        messageId: originalProposal.messageId,
        agentId: originalProposal.agentId,
        actionType: originalProposal.actionType,
        parameters: Object.assign(Object.assign({}, originalProposal.parameters), req.body.parameters),
        reasoning: req.body.reasoning || originalProposal.reasoning,
        affectedEntities: req.body.affectedEntities || originalProposal.affectedEntities,
        confidenceScore: originalProposal.confidenceScore,
        status: 'pending',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });
    // Link original to new
    await originalProposal.update({ modifiedProposalId: newProposal.id });
    await req.responseHandler.success(req, res, {
        originalProposal: originalProposal.get({ plain: true }),
        newProposal: newProposal.get({ plain: true }),
    });
};
//# sourceMappingURL=proposalModify.js.map