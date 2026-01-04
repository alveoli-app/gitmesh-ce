"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../services/user/permissionChecker"));
const chatService_1 = __importDefault(require("../../services/chat/chatService"));
/**
 * POST /tenant/{tenantId}/chat/proposals/:proposalId/approve
 * @summary Approve and execute an action proposal
 * @tag Chat Actions
 * @security Bearer
 */
exports.default = async (req, res) => {
    var _a;
    try {
        new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberEdit);
        const { proposalId } = req.params;
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(proposalId)) {
            return res.status(400).json({ error: 'Invalid proposal ID format' });
        }
        const chatService = new chatService_1.default(Object.assign(Object.assign({}, req), { database: req.database, currentUser: req.currentUser, currentTenant: req.currentTenant, log: req.log }));
        const result = await chatService.approveProposal(proposalId);
        // Emit Socket.IO event for real-time update
        if (global.devtelWebSocket) {
            global.devtelWebSocket.emitToConversation(result.proposal.conversationId, 'proposal:executed', {
                proposalId: result.proposal.id,
                execution: result.execution,
            });
        }
        // Log the action for audit purposes
        req.log.info({
            action: 'proposal_approved',
            proposalId,
            actionType: result.proposal.actionType,
            executedBy: req.currentUser.id,
            status: result.execution.status,
        }, 'Action proposal approved and executed');
        await req.responseHandler.success(req, res, result);
    }
    catch (error) {
        req.log.error({
            error: error.message,
            stack: error.stack,
            proposalId: req.params.proposalId
        }, 'Failed to approve proposal');
        if (error.message === 'Proposal not found or already processed') {
            return res.status(404).json({ error: error.message });
        }
        if (error.message === 'Access denied') {
            return res.status(403).json({ error: 'Access denied' });
        }
        if ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('expired')) {
            return res.status(410).json({ error: 'Proposal has expired' });
        }
        return res.status(500).json({
            error: 'Failed to approve proposal',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
//# sourceMappingURL=proposalApprove.js.map