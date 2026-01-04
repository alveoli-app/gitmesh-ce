"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const common_1 = require("@gitmesh/common");
/**
 * PUT /tenant/{tenantId}/devtel/team/:userId
 * @summary Update team member profile
 * @tag DevTel Team
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberEdit);
    const { userId } = req.params;
    const user = await req.database.user.findOne({
        where: { id: userId },
        include: [
            {
                model: req.database.tenantUser,
                as: 'tenants',
                where: { tenantId: req.currentTenant.id },
                attributes: [],
            },
        ],
    });
    if (!user) {
        throw new common_1.Error400(req.language, 'devtel.user.notFound');
    }
    // For DevTel, we only allow updating limited fields
    // Most user updates go through the main user routes
    // This is a placeholder for DevTel-specific fields
    await req.responseHandler.success(req, res, user);
};
//# sourceMappingURL=teamMemberUpdate.js.map