"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../services/user/permissionChecker"));
const chatService_1 = __importDefault(require("../../services/chat/chatService"));
/**
 * Get messages for a conversation
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberRead);
    const chatService = new chatService_1.default(Object.assign(Object.assign({}, req), { database: req.database, currentUser: req.currentUser, currentTenant: req.currentTenant, log: req.log }));
    const messages = await chatService.getMessages(req.params.conversationId, {
        limit: parseInt(req.query.limit) || 100,
        before: req.query.before,
        after: req.query.after,
    });
    await req.responseHandler.success(req, res, messages);
};
//# sourceMappingURL=messageList.js.map