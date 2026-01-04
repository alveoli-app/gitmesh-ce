"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../services/user/permissionChecker"));
/**
 * Get action details
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberRead);
    const action = await req.database.chatExecutedActions.findOne({
        where: {
            id: req.params.actionId,
            tenantId: req.currentTenant.id,
        },
        include: [
            {
                model: req.database.user,
                as: 'executor',
                attributes: ['id', 'fullName', 'email'],
            },
            {
                model: req.database.chatActionProposals,
                as: 'proposal',
            },
        ],
    });
    if (!action) {
        return res.status(404).json({ error: 'Action not found' });
    }
    await req.responseHandler.success(req, res, action.get({ plain: true }));
};
//# sourceMappingURL=actionFind.js.map