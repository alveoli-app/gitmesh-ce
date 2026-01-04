"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const common_1 = require("@gitmesh/common");
/**
 * GET /tenant/{tenantId}/devtel/team/:userId
 * @summary Get team member details
 * @tag DevTel Team
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberRead);
    const { userId } = req.params;
    const user = await req.database.user.findOne({
        where: {
            id: userId,
            tenantId: req.currentTenant.id,
        },
        attributes: ['id', 'fullName', 'email', 'firstName', 'lastName', 'createdAt'],
    });
    if (!user) {
        throw new common_1.Error400(req.language, 'devtel.user.notFound');
    }
    await req.responseHandler.success(req, res, user);
};
//# sourceMappingURL=teamMemberFind.js.map