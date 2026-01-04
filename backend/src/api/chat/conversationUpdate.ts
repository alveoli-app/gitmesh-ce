import Permissions from '../../security/permissions'
import PermissionChecker from '../../services/user/permissionChecker'
import ChatService from '../../services/chat/chatService'

/**
 * Update a conversation (rename, context)
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

    const conversation = await chatService.updateConversation(
        req.params.conversationId,
        {
            title: req.body.title,
            context: req.body.context,
            status: req.body.status,
        }
    )

    await req.responseHandler.success(req, res, conversation)
}
