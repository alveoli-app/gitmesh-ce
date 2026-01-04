"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const devtelWorkspaceService_1 = __importDefault(require("../../../services/devtel/devtelWorkspaceService"));
/**
 * GET /tenant/{tenantId}/devtel/filters
 * @summary List saved filters for current user
 * @tag DevTel Filters
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberRead);
    const workspaceService = new devtelWorkspaceService_1.default(req);
    const workspace = await workspaceService.getForCurrentTenant();
    const filters = await req.database.devtelUserSavedFilters.findAll({
        where: {
            userId: req.currentUser.id,
            workspaceId: workspace.id,
        },
        order: [['createdAt', 'DESC']],
    });
    await req.responseHandler.success(req, res, filters);
};
//# sourceMappingURL=filterList.js.map