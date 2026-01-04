"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const devtelWorkspaceService_1 = __importDefault(require("../../../services/devtel/devtelWorkspaceService"));
/**
 * GET /tenant/{tenantId}/devtel/settings/agents
 * @summary Get AI agent settings
 * @tag DevTel Settings
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.settingsRead);
    const workspaceService = new devtelWorkspaceService_1.default(req);
    const workspace = await workspaceService.getForCurrentTenant();
    const agentSettings = await req.database.devtelAgentSettings.findOne({
        where: { workspaceId: workspace.id },
    });
    await req.responseHandler.success(req, res, agentSettings);
};
//# sourceMappingURL=agentSettingsGet.js.map