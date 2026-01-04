"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const devtelWorkspaceService_1 = __importDefault(require("../../../services/devtel/devtelWorkspaceService"));
/**
 * PUT /tenant/{tenantId}/devtel/settings/agents
 * @summary Update AI agent settings
 * @tag DevTel Settings
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.settingsEdit);
    const { enabledAgents, temperature, approvalRequired, customPrompts } = req.body;
    const workspaceService = new devtelWorkspaceService_1.default(req);
    const workspace = await workspaceService.getForCurrentTenant();
    const updateData = {};
    if (enabledAgents !== undefined)
        updateData.enabledAgents = enabledAgents;
    if (temperature !== undefined)
        updateData.temperature = temperature;
    if (approvalRequired !== undefined)
        updateData.approvalRequired = approvalRequired;
    if (customPrompts !== undefined)
        updateData.customPrompts = customPrompts;
    await req.database.devtelAgentSettings.update(updateData, {
        where: { workspaceId: workspace.id },
    });
    const agentSettings = await req.database.devtelAgentSettings.findOne({
        where: { workspaceId: workspace.id },
    });
    await req.responseHandler.success(req, res, agentSettings);
};
//# sourceMappingURL=agentSettingsUpdate.js.map