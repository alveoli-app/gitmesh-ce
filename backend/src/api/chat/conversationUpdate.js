"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../security/permissions"));
const chatService_1 = __importDefault(require("../../services/chat/chatService"));
/**
 * Update a conversation (rename, context)
 */
exports.default = async (req, res) => {
    const payload = new permissions_1.default(req.currentUser, req.currentTenant).edit;
    const chatService = new chatService_1.default(Object.assign(Object.assign({}, req), { database: req.database, currentUser: req.currentUser, currentTenant: req.currentTenant, log: req.log }));
    const conversation = await chatService.updateConversation(req.params.conversationId, {
        title: req.body.title,
        context: req.body.context,
        status: req.body.status,
    });
    await req.responseHandler.success(req, res, conversation);
};
//# sourceMappingURL=conversationUpdate.js.map