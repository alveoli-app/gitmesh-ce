import Permissions from '../../security/permissions'
import PermissionChecker from '../../services/user/permissionChecker'
import ChatService from '../../services/chat/chatService'

/**
 * Submit feedback for an agent message
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

    const feedback = await chatService.submitFeedback(req.params.messageId, {
        rating: req.body.rating,
        categories: req.body.categories,
        comment: req.body.comment,
    })

    await req.responseHandler.success(req, res, feedback)
}
