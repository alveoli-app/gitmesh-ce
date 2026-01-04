"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const devtelWorkspaceService_1 = __importDefault(require("../../../services/devtel/devtelWorkspaceService"));
const common_1 = require("@gitmesh/common");
const crypto_1 = __importDefault(require("crypto"));
/**
 * POST /tenant/{tenantId}/devtel/settings/webhooks
 * @summary Create a webhook
 * @tag DevTel Settings
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.settingsEdit);
    const { url, events } = req.body;
    if (!url) {
        throw new common_1.Error400(req.language, 'devtel.webhook.urlRequired');
    }
    const workspaceService = new devtelWorkspaceService_1.default(req);
    const workspace = await workspaceService.getForCurrentTenant();
    // Generate a secret for signing
    const secret = crypto_1.default.randomBytes(32).toString('hex');
    const webhook = await req.database.devtelWebhooks.create({
        workspaceId: workspace.id,
        url,
        secret,
        events: events || ['issue.created', 'issue.updated', 'cycle.completed'],
        enabled: true,
        deliveryStats: {},
    });
    await req.responseHandler.success(req, res, {
        id: webhook.id,
        url: webhook.url,
        secret: webhook.secret, // Only shown on create
        events: webhook.events,
        enabled: webhook.enabled,
    });
};
//# sourceMappingURL=webhookCreate.js.map