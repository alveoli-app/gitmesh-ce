import Permissions from '../../security/permissions'
import PermissionChecker from '../../services/user/permissionChecker'
import ChatService from '../../services/chat/chatService'

/**
 * POST /tenant/{tenantId}/chat/proposals/:proposalId/approve
 * @summary Approve and execute an action proposal
 * @tag Chat Actions
 * @security Bearer
 */
export default async (req, res) => {
    try {
        new PermissionChecker(req).validateHas(Permissions.values.memberEdit)

        const { proposalId } = req.params

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(proposalId)) {
            return res.status(400).json({ error: 'Invalid proposal ID format' })
        }

        const chatService = new ChatService({
            ...req,
            database: req.database,
            currentUser: req.currentUser,
            currentTenant: req.currentTenant,
            log: req.log,
        })

        const result = await chatService.approveProposal(proposalId)

        // Emit Socket.IO event for real-time update
        if (global.devtelWebSocket) {
            global.devtelWebSocket.emitToConversation(result.proposal.conversationId, 'proposal:executed', {
                proposalId: result.proposal.id,
                execution: result.execution,
            })
        }

        // Log the action for audit purposes
        req.log.info({
            action: 'proposal_approved',
            proposalId,
            actionType: result.proposal.actionType,
            executedBy: req.currentUser.id,
            status: result.execution.status,
        }, 'Action proposal approved and executed')

        await req.responseHandler.success(req, res, result)
    } catch (error: any) {
        req.log.error({
            error: error.message,
            stack: error.stack,
            proposalId: req.params.proposalId
        }, 'Failed to approve proposal')

        if (error.message === 'Proposal not found or already processed') {
            return res.status(404).json({ error: error.message })
        }

        if (error.message === 'Access denied') {
            return res.status(403).json({ error: 'Access denied' })
        }

        if (error.message?.includes('expired')) {
            return res.status(410).json({ error: 'Proposal has expired' })
        }

        return res.status(500).json({
            error: 'Failed to approve proposal',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
    }
}
