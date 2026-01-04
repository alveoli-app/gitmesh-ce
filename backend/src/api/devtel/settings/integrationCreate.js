"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const devtelWorkspaceService_1 = __importDefault(require("../../../services/devtel/devtelWorkspaceService"));
const common_1 = require("@gitmesh/common");
/**
 * POST /tenant/{tenantId}/devtel/settings/integrations
 * @summary Create a new external integration
 * @tag DevSpace Settings
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.settingsEdit);
    const { provider, credentials, settings } = req.body;
    req.log.info({ provider, hasCredentials: !!credentials, hasSettings: !!settings }, 'Creating new integration');
    if (!provider) {
        req.log.error({}, 'Provider is required');
        throw new common_1.Error400(req.language, 'devtel.integration.providerRequired');
    }
    const workspaceService = new devtelWorkspaceService_1.default(req);
    const workspace = await workspaceService.getForCurrentTenant();
    req.log.info({ workspaceId: workspace.id, provider }, 'Got workspace for integration');
    // Check if integration already exists for this provider
    const existing = await req.database.devtelIntegrations.findOne({
        where: {
            workspaceId: workspace.id,
            provider,
        },
    });
    if (existing) {
        req.log.warn({ workspaceId: workspace.id, provider, existingId: existing.id }, 'Integration already exists for this provider');
        throw new common_1.Error400(req.language, 'devtel.integration.alreadyExists');
    }
    req.log.info({ workspaceId: workspace.id, provider }, 'Creating integration record');
    const integration = await req.database.devtelIntegrations.create({
        workspaceId: workspace.id,
        provider,
        credentials: credentials || {},
        settings: settings || {},
        status: 'pending',
    });
    req.log.info({
        integrationId: integration.id,
        workspaceId: workspace.id,
        provider
    }, 'Integration created successfully');
    // For GitHub, log the webhook URL that should be configured
    if (provider === 'github') {
        const webhookUrl = `${req.protocol}://${req.get('host')}/webhook/devtel/github/${workspace.id}`;
        req.log.info({
            integrationId: integration.id,
            webhookUrl
        }, 'GitHub integration created. Configure this webhook URL in your GitHub App settings.');
    }
    await req.responseHandler.success(req, res, {
        id: integration.id,
        provider: integration.provider,
        status: integration.status,
        createdAt: integration.createdAt,
    });
};
//# sourceMappingURL=integrationCreate.js.map