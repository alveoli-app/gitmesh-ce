import Permissions from '../../security/permissions'
import PermissionChecker from '../../services/user/permissionChecker'

/**
 * Modify a proposal (creates a new modified proposal)
 */
export default async (req, res) => {
    const payload = new Permissions(req.currentUser, req.currentTenant).edit
    const { proposalId } = req.params

    // Find original proposal
    const originalProposal = await req.database.chatActionProposals.findOne({
        where: {
            id: proposalId,
            status: 'pending',
        },
    })

    if (!originalProposal) {
        return res.status(404).json({ error: 'Proposal not found or already processed' })
    }

    // Verify user has access
    const conversation = await req.database.chatConversations.findOne({
        where: {
            id: originalProposal.conversationId,
            userId: req.currentUser.id,
        },
    })

    if (!conversation) {
        return res.status(403).json({ error: 'Access denied' })
    }

    // Mark original as modified
    await originalProposal.update({
        status: 'modified',
        respondedAt: new Date(),
        respondedBy: req.currentUser.id,
    })

    // Create new proposal with modified parameters
    const newProposal = await req.database.chatActionProposals.create({
        conversationId: originalProposal.conversationId,
        messageId: originalProposal.messageId,
        agentId: originalProposal.agentId,
        actionType: originalProposal.actionType,
        parameters: {
            ...originalProposal.parameters,
            ...req.body.parameters,
        },
        reasoning: req.body.reasoning || originalProposal.reasoning,
        affectedEntities: req.body.affectedEntities || originalProposal.affectedEntities,
        confidenceScore: originalProposal.confidenceScore,
        status: 'pending',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),  // 1 hour
    })

    // Link original to new
    await originalProposal.update({ modifiedProposalId: newProposal.id })

    await req.responseHandler.success(req, res, {
        originalProposal: originalProposal.get({ plain: true }),
        newProposal: newProposal.get({ plain: true }),
    })
}
