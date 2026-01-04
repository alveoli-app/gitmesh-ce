"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const common_1 = require("@gitmesh/common");
/**
 * POST /tenant/{tenantId}/devtel/settings/integrations/:integrationId/sync
 * @summary Trigger manual sync for an integration
 * @tag DevSpace Settings
 * @security Bearer
 */
exports.default = async (req, res) => {
    var _a;
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.settingsEdit);
    const { integrationId } = req.params;
    req.log.info({ integrationId }, 'Starting manual integration sync');
    try {
        // Get integration
        const integration = await req.database.devtelIntegrations.findByPk(integrationId);
        if (!integration) {
            req.log.error({ integrationId }, 'Integration not found');
            throw new common_1.Error400(req.language, 'devtel.integration.notFound');
        }
        req.log.info({ integration: integration.toJSON() }, 'Found integration');
        // Check integration is active
        if (integration.status !== 'active') {
            req.log.error({ integrationId, status: integration.status }, 'Integration is not active');
            throw new common_1.Error400(req.language, 'devtel.integration.notActive', integration.status);
        }
        // Check provider
        if (integration.provider !== 'github') {
            req.log.error({ integrationId, provider: integration.provider }, 'Unsupported provider for sync');
            throw new common_1.Error400(req.language, 'devtel.integration.unsupportedProvider');
        }
        // Get OAuth token
        const accessToken = (_a = integration.credentials) === null || _a === void 0 ? void 0 : _a.accessToken;
        if (!accessToken) {
            req.log.error({ integrationId }, 'No access token found in integration credentials');
            throw new common_1.Error400(req.language, 'devtel.integration.noAccessToken');
        }
        req.log.info({ integrationId }, 'Starting GitHub sync...');
        // TODO: Implement actual GitHub sync logic
        // 1. Create GitHub API client with accessToken
        // 2. Fetch repositories
        // 3. Fetch issues and PRs for each repo
        // 4. Create/update devtelIssues records
        // 5. Create/update devtelExternalLinks records
        // 6. Return sync statistics
        // For now, just log that sync was triggered
        req.log.info({ integrationId, provider: integration.provider }, 'GitHub sync triggered (implementation pending)');
        // Update integration lastSyncAt timestamp
        await integration.update({
            lastSyncAt: new Date(),
            updatedAt: new Date(),
        });
        await req.responseHandler.success(req, res, {
            success: true,
            message: 'Sync triggered successfully',
            integrationId,
            provider: integration.provider,
            syncedAt: new Date().toISOString(),
            // TODO: Add actual sync stats
            stats: {
                repositoriesProcessed: 0,
                issuesCreated: 0,
                issuesUpdated: 0,
                pullRequestsProcessed: 0,
            },
        });
    }
    catch (error) {
        req.log.error({ error, integrationId }, 'Error during integration sync');
        throw error;
    }
};
//# sourceMappingURL=integrationSync.js.map