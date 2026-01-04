"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../security/permissions"));
const chatService_1 = __importDefault(require("../../services/chat/chatService"));
/**
 * Reject an action proposal
 */
exports.default = async (req, res) => {
    const payload = new permissions_1.default(req.currentUser, req.currentTenant).edit;
    const chatService = new chatService_1.default(Object.assign(Object.assign({}, req), { database: req.database, currentUser: req.currentUser, currentTenant: req.currentTenant, log: req.log }));
    const proposal = await chatService.rejectProposal(req.params.proposalId, req.body.reason);
    // Emit Socket.IO event for real-time update
    if (req.io) {
        req.io.of('/chat').to(`conversation:${proposal.conversationId}`).emit('proposal:rejected', {
            proposalId: proposal.id,
            reason: req.body.reason,
        });
    }
    await req.responseHandler.success(req, res, proposal);
};
//# sourceMappingURL=proposalReject.js.map