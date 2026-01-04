import Permissions from '../../security/permissions'
import PermissionChecker from '../../services/user/permissionChecker'
import ChatService from '../../services/chat/chatService'

/**
 * GET /tenant/{tenantId}/chat/conversations
 * @summary List conversations for current user
 * @tag Chat
 * @security Bearer
 */
export default async (req, res) => {
    try {
        new PermissionChecker(req).validateHas(Permissions.values.memberRead)

        const chatService = new ChatService({
            ...req,
            database: req.database,
            currentUser: req.currentUser,
            currentTenant: req.currentTenant,
            log: req.log,
        })

        // Validate query parameters
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100)
        const offset = Math.max(parseInt(req.query.offset) || 0, 0)

        const result = await chatService.listConversations({
            status: req.query.status,
            projectId: req.query.projectId,
            limit,
            offset,
        })

        await req.responseHandler.success(req, res, result)
    } catch (error: any) {
        req.log.error({ error: error.message, stack: error.stack }, 'Failed to list conversations')

        if (error.code === 403) {
            return res.status(403).json({ error: 'Access denied' })
        }

        return res.status(500).json({
            error: 'Failed to list conversations',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
    }
}
