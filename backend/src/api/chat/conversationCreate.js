"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../services/user/permissionChecker"));
const chatService_1 = __importDefault(require("../../services/chat/chatService"));
/**
 * POST /tenant/{tenantId}/chat/conversations
 * @summary Create a new conversation
 * @tag Chat
 * @security Bearer
 */
exports.default = async (req, res) => {
    try {
        new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberEdit);
        // Validate input
        const { projectId, title, context } = req.body;
        if (title && typeof title !== 'string') {
            return res.status(400).json({ error: 'Title must be a string' });
        }
        if (title && title.length > 500) {
            return res.status(400).json({ error: 'Title must be 500 characters or less' });
        }
        if (context && typeof context !== 'object') {
            return res.status(400).json({ error: 'Context must be an object' });
        }
        // Validate projectId if provided
        if (projectId) {
            const project = await req.database.devtelProjects.findOne({
                where: { id: projectId, deletedAt: null }
            });
            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }
        }
        const chatService = new chatService_1.default(Object.assign(Object.assign({}, req), { database: req.database, currentUser: req.currentUser, currentTenant: req.currentTenant, log: req.log }));
        const conversation = await chatService.createConversation({
            projectId,
            title,
            context,
        });
        await req.responseHandler.success(req, res, conversation);
    }
    catch (error) {
        req.log.error({ error: error.message, stack: error.stack }, 'Failed to create conversation');
        if (error.code === 403) {
            return res.status(403).json({ error: 'Access denied' });
        }
        return res.status(500).json({
            error: 'Failed to create conversation',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
//# sourceMappingURL=conversationCreate.js.map