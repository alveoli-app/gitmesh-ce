"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../services/user/permissionChecker"));
const chatService_1 = __importDefault(require("../../services/chat/chatService"));
/**
 * POST /tenant/{tenantId}/chat/conversations/:conversationId/messages
 * @summary Send a message and trigger agent processing
 * @tag Chat
 * @security Bearer
 */
exports.default = async (req, res) => {
    try {
        new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberEdit);
        const { conversationId } = req.params;
        const { content, mentionedEntities = [] } = req.body;
        // Validate required fields
        if (!content || typeof content !== 'string') {
            return res.status(400).json({ error: 'Content is required and must be a string' });
        }
        if (content.trim().length === 0) {
            return res.status(400).json({ error: 'Content cannot be empty' });
        }
        if (content.length > 10000) {
            return res.status(400).json({ error: 'Content must be 10000 characters or less' });
        }
        // Validate UUID format for conversationId
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(conversationId)) {
            return res.status(400).json({ error: 'Invalid conversation ID format' });
        }
        // Validate mentionedEntities array
        if (!Array.isArray(mentionedEntities)) {
            return res.status(400).json({ error: 'mentionedEntities must be an array' });
        }
        for (const entity of mentionedEntities) {
            if (!entity.type || !entity.id) {
                return res.status(400).json({ error: 'Each mentioned entity must have type and id' });
            }
            if (!['issue', 'user', 'cycle', 'spec'].includes(entity.type)) {
                return res.status(400).json({ error: `Invalid entity type: ${entity.type}` });
            }
        }
        const chatService = new chatService_1.default(Object.assign(Object.assign({}, req), { database: req.database, currentUser: req.currentUser, currentTenant: req.currentTenant, log: req.log }));
        const result = await chatService.sendMessage({
            conversationId,
            content: content.trim(),
            mentionedEntities,
        });
        // Emit Socket.IO event for real-time update
        if (global.devtelWebSocket) {
            global.devtelWebSocket.emitToConversation(conversationId, 'message:created', {
                message: result.userMessage,
                agentMessage: result.agentMessage,
            });
        }
        await req.responseHandler.success(req, res, result);
    }
    catch (error) {
        req.log.error({
            error: error.message,
            stack: error.stack,
            conversationId: req.params.conversationId
        }, 'Failed to send message');
        if (error.message === 'Conversation not found') {
            return res.status(404).json({ error: 'Conversation not found' });
        }
        if (error.code === 403) {
            return res.status(403).json({ error: 'Access denied' });
        }
        return res.status(500).json({
            error: 'Failed to send message',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
//# sourceMappingURL=messageCreate.js.map