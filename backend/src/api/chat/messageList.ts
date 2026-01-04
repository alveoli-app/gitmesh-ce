import Permissions from '../../security/permissions'
import PermissionChecker from '../../services/user/permissionChecker'
import ChatService from '../../services/chat/chatService'

/**
 * Get messages for a conversation
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

    const messages = await chatService.getMessages(
        req.params.conversationId,
        {
            limit: parseInt(req.query.limit) || 100,
            before: req.query.before,
            after: req.query.after,
        }
    )

    await req.responseHandler.success(req, res, messages)
}
