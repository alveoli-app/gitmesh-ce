"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const common_1 = require("@gitmesh/common");
/**
 * POST /tenant/{tenantId}/devtel/settings/integrations/:integrationId/test
 * @summary Test an integration connection
 * @tag DevSpace Settings
 * @security Bearer
 */
exports.default = async (req, res) => {
    var _a;
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.settingsEdit);
    const { integrationId } = req.params;
    req.log.info({ integrationId }, 'Testing integration connection');
    const integration = await req.database.devtelIntegrations.findByPk(integrationId);
    if (!integration) {
        req.log.error({ integrationId }, 'Integration not found');
        throw new common_1.Error400(req.language, 'devtel.integration.notFound');
    }
    req.log.info({
        integrationId,
        provider: integration.provider,
        status: integration.status
    }, 'Found integration, starting connection test');
    // Provider-specific test logic
    let testResult = { success: true, message: 'Connection successful', details: {} };
    try {
        switch (integration.provider) {
            case 'github':
                req.log.info({ integrationId }, 'Testing GitHub API connection');
                // Get OAuth token
                const accessToken = (_a = integration.credentials) === null || _a === void 0 ? void 0 : _a.accessToken;
                if (!accessToken) {
                    req.log.error({ integrationId }, 'No access token found in integration credentials');
                    throw new Error('No access token found. Please reconnect the integration.');
                }
                req.log.info({ integrationId }, 'Found access token, calling GitHub API');
                // Test GitHub API connection with a simple user request
                const response = await fetch('https://api.github.com/user', {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        Accept: 'application/vnd.github.v3+json',
                        'User-Agent': 'GitMesh-DevTel',
                    },
                });
                if (!response.ok) {
                    const errorBody = await response.text();
                    req.log.error({
                        integrationId,
                        status: response.status,
                        statusText: response.statusText,
                        body: errorBody
                    }, 'GitHub API request failed');
                    throw new Error(`GitHub API returned ${response.status}: ${response.statusText}`);
                }
                const userData = await response.json();
                req.log.info({
                    integrationId,
                    login: userData.login,
                    name: userData.name
                }, 'GitHub API connection successful');
                testResult.details = {
                    user: userData.login,
                    name: userData.name,
                    email: userData.email,
                    apiUrl: 'https://api.github.com',
                };
                break;
            case 'jira':
                req.log.warn({ integrationId }, 'Jira test not implemented yet');
                testResult.message = 'Jira test not implemented yet';
                break;
            default:
                req.log.info({ integrationId, provider: integration.provider }, 'No specific test for this provider');
                testResult.message = 'No test available for this provider';
        }
        // Update integration status
        await integration.update({ status: 'active' });
        req.log.info({ integrationId, provider: integration.provider }, 'Integration test passed, status set to active');
    }
    catch (error) {
        req.log.error({ error, integrationId }, 'Integration test failed');
        testResult = { success: false, message: error.message, details: {} };
        await integration.update({ status: 'error' });
    }
    await req.responseHandler.success(req, res, testResult);
};
//# sourceMappingURL=integrationTest.js.map