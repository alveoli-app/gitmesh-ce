import Permissions from '../../security/permissions'
import PermissionChecker from '../../services/user/permissionChecker'
import ChatService from '../../services/chat/chatService'

/**
 * Get a single conversation with its messages
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

    const conversation = await chatService.getConversation(
        req.params.conversationId,
        req.query.includeMessages !== 'false'
    )

    await req.responseHandler.success(req, res, conversation)
}
