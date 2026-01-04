"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../security/permissions"));
const chatService_1 = __importDefault(require("../../services/chat/chatService"));
/**
 * Delete (archive) a conversation
 */
exports.default = async (req, res) => {
    const payload = new permissions_1.default(req.currentUser, req.currentTenant).edit;
    const chatService = new chatService_1.default(Object.assign(Object.assign({}, req), { database: req.database, currentUser: req.currentUser, currentTenant: req.currentTenant, log: req.log }));
    const result = await chatService.deleteConversation(req.params.conversationId);
    await req.responseHandler.success(req, res, result);
};
//# sourceMappingURL=conversationDestroy.js.map