"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../services/user/permissionChecker"));
const chatService_1 = __importDefault(require("../../services/chat/chatService"));
/**
 * Get pending action proposals for a conversation
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberRead);
    const chatService = new chatService_1.default(Object.assign(Object.assign({}, req), { database: req.database, currentUser: req.currentUser, currentTenant: req.currentTenant, log: req.log }));
    const { conversationId } = req.query;
    let proposals;
    if (conversationId) {
        proposals = await chatService.getPendingProposals(conversationId);
    }
    else {
        // Fetch all pending proposals for the tenant
        proposals = await req.database.chatActionProposals.findAll({
            where: {
                status: 'pending',
            },
            include: [
                {
                    model: req.database.chatConversations,
                    as: 'conversation',
                    where: {
                        tenantId: req.currentTenant.id,
                    },
                    attributes: ['id', 'title', 'projectId'],
                }
            ],
            order: [['createdAt', 'DESC']],
        });
        proposals = proposals.map((p) => p.get({ plain: true }));
    }
    await req.responseHandler.success(req, res, proposals);
};
//# sourceMappingURL=proposalList.js.map