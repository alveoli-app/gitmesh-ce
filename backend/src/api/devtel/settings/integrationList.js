"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const devtelWorkspaceService_1 = __importDefault(require("../../../services/devtel/devtelWorkspaceService"));
/**
 * GET /tenant/{tenantId}/devtel/settings/integrations
 * @summary List external integrations
 * @tag DevTel Settings
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.settingsRead);
    const workspaceService = new devtelWorkspaceService_1.default(req);
    const workspace = await workspaceService.getForCurrentTenant();
    const integrations = await req.database.devtelIntegrations.findAll({
        where: { workspaceId: workspace.id },
        attributes: ['id', 'provider', 'status', 'settings', 'lastSyncedAt', 'createdAt'],
        order: [['createdAt', 'DESC']],
    });
    await req.responseHandler.success(req, res, integrations);
};
//# sourceMappingURL=integrationList.js.map