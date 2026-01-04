"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../security/permissions"));
/**
 * Mark an insight as resolved
 */
exports.default = async (req, res) => {
    const payload = new permissions_1.default(req.currentUser, req.currentTenant).edit;
    const { insightId } = req.params;
    const insight = await req.database.agentInsights.findOne({
        where: {
            id: insightId,
            tenantId: req.currentTenant.id,
        },
    });
    if (!insight) {
        return res.status(404).json({ error: 'Insight not found' });
    }
    if (insight.status !== 'active') {
        return res.status(400).json({ error: 'Insight has already been processed' });
    }
    // Update insight status
    await insight.update({
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: req.currentUser.id,
    });
    await req.responseHandler.success(req, res, insight.get({ plain: true }));
};
//# sourceMappingURL=insightResolve.js.map