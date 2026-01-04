import Permissions from '../../security/permissions'
import PermissionChecker from '../../services/user/permissionChecker'
import ChatService from '../../services/chat/chatService'

/**
 * Delete (archive) a conversation
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

    const result = await chatService.deleteConversation(req.params.conversationId)

    await req.responseHandler.success(req, res, result)
}
