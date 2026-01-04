import Permissions from '../../security/permissions'
import PermissionChecker from '../../services/user/permissionChecker'
import ChatService from '../../services/chat/chatService'

/**
 * Get pending action proposals for a conversation
 */
export default async (req, res) => {
    new PermissionChecker(req).validateHas(Permissions.values.memberRead)

    const chatService = new ChatService({
        ...req,
        database: req.database,
        currentUser: req.currentUser,
        currentTenant: req.currentTenant,
        log: req.log,
    })

    const { conversationId } = req.query

    let proposals
    if (conversationId) {
        proposals = await chatService.getPendingProposals(conversationId)
    } else {
        // Fetch all pending proposals for the tenant
        proposals = await req.database.chatActionProposals.findAll({
            where: {
                status: 'pending',
            },
            include: [
                {
                    model: req.database.chatConversations,
                    as: 'conversation',
                    where: {
                        tenantId: req.currentTenant.id,
                    },
                    attributes: ['id', 'title', 'projectId'],
                }
            ],
            order: [['createdAt', 'DESC']],
        })
        proposals = proposals.map((p: any) => p.get({ plain: true }))
    }

    await req.responseHandler.success(req, res, proposals)
}
