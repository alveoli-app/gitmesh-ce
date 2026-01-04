"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const common_1 = require("@gitmesh/common");
/**
 * DELETE /tenant/{tenantId}/devtel/settings/integrations/:integrationId
 * @summary Delete an integration
 * @tag DevTel Settings
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.settingsEdit);
    const { integrationId } = req.params;
    const integration = await req.database.devtelIntegrations.findByPk(integrationId);
    if (!integration) {
        throw new common_1.Error400(req.language, 'devtel.integration.notFound');
    }
    await integration.destroy();
    await req.responseHandler.success(req, res, { success: true });
};
//# sourceMappingURL=integrationDestroy.js.map