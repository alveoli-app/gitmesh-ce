"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../services/user/permissionChecker"));
const chatService_1 = __importDefault(require("../../services/chat/chatService"));
/**
 * GET /tenant/{tenantId}/chat/conversations
 * @summary List conversations for current user
 * @tag Chat
 * @security Bearer
 */
exports.default = async (req, res) => {
    try {
        new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberRead);
        const chatService = new chatService_1.default(Object.assign(Object.assign({}, req), { database: req.database, currentUser: req.currentUser, currentTenant: req.currentTenant, log: req.log }));
        // Validate query parameters
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
        const offset = Math.max(parseInt(req.query.offset) || 0, 0);
        const result = await chatService.listConversations({
            status: req.query.status,
            projectId: req.query.projectId,
            limit,
            offset,
        });
        await req.responseHandler.success(req, res, result);
    }
    catch (error) {
        req.log.error({ error: error.message, stack: error.stack }, 'Failed to list conversations');
        if (error.code === 403) {
            return res.status(403).json({ error: 'Access denied' });
        }
        return res.status(500).json({
            error: 'Failed to list conversations',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
//# sourceMappingURL=conversationList.js.map