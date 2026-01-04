import Permissions from '../../security/permissions'
import PermissionChecker from '../../services/user/permissionChecker'
import ChatService from '../../services/chat/chatService'

/**
 * Reject an action proposal
 */
export default async (req, res) => {
    const payload = new Permissions(req.currentUser, req.currentTenant).edit

    const chatService = new ChatService({
        ...req,
        database: req.database,
        currentUser: req.currentUser,
        currentTenant: req.currentTenant,
        log: req.log,
    })

    const proposal = await chatService.rejectProposal(
        req.params.proposalId,
        req.body.reason
    )

    // Emit Socket.IO event for real-time update
    if (req.io) {
        req.io.of('/chat').to(`conversation:${proposal.conversationId}`).emit('proposal:rejected', {
            proposalId: proposal.id,
            reason: req.body.reason,
        })
    }

    await req.responseHandler.success(req, res, proposal)
}
