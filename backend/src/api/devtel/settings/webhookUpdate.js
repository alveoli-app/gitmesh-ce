"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const common_1 = require("@gitmesh/common");
/**
 * PUT /tenant/{tenantId}/devtel/settings/webhooks/:webhookId
 * @summary Update a webhook
 * @tag DevTel Settings
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.settingsEdit);
    const { webhookId } = req.params;
    const { url, events, enabled } = req.body;
    const webhook = await req.database.devtelWebhooks.findByPk(webhookId);
    if (!webhook) {
        throw new common_1.Error400(req.language, 'devtel.webhook.notFound');
    }
    const updateData = {};
    if (url !== undefined)
        updateData.url = url;
    if (events !== undefined)
        updateData.events = events;
    if (enabled !== undefined)
        updateData.enabled = enabled;
    await webhook.update(updateData);
    await req.responseHandler.success(req, res, webhook);
};
//# sourceMappingURL=webhookUpdate.js.map