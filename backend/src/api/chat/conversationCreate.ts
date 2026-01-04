import Permissions from '../../security/permissions'
import PermissionChecker from '../../services/user/permissionChecker'
import ChatService from '../../services/chat/chatService'

/**
 * POST /tenant/{tenantId}/chat/conversations
 * @summary Create a new conversation
 * @tag Chat
 * @security Bearer
 */
export default async (req, res) => {
    try {
        new PermissionChecker(req).validateHas(Permissions.values.memberEdit)

        // Validate input
        const { projectId, title, context } = req.body

        if (title && typeof title !== 'string') {
            return res.status(400).json({ error: 'Title must be a string' })
        }

        if (title && title.length > 500) {
            return res.status(400).json({ error: 'Title must be 500 characters or less' })
        }

        if (context && typeof context !== 'object') {
            return res.status(400).json({ error: 'Context must be an object' })
        }

        // Validate projectId if provided
        if (projectId) {
            const project = await req.database.devtelProjects.findOne({
                where: { id: projectId, deletedAt: null }
            })
            if (!project) {
                return res.status(404).json({ error: 'Project not found' })
            }
        }

        const chatService = new ChatService({
            ...req,
            database: req.database,
            currentUser: req.currentUser,
            currentTenant: req.currentTenant,
            log: req.log,
        })

        const conversation = await chatService.createConversation({
            projectId,
            title,
            context,
        })

        await req.responseHandler.success(req, res, conversation)
    } catch (error: any) {
        req.log.error({ error: error.message, stack: error.stack }, 'Failed to create conversation')

        if (error.code === 403) {
            return res.status(403).json({ error: 'Access denied' })
        }

        return res.status(500).json({
            error: 'Failed to create conversation',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
    }
}
