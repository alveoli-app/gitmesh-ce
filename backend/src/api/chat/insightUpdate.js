"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logging_1 = require("@gitmesh/logging");
const sequelizeRepository_1 = __importDefault(require("../../database/repositories/sequelizeRepository"));
const common_1 = require("@gitmesh/common");
exports.default = async (req, res) => {
    const log = (0, logging_1.getServiceLogger)();
    const { tenantId, id } = req.params;
    const { status, dismissedReason } = req.body;
    log.info(`[InsightUpdate] Updating insight ${id} for tenant ${tenantId}`);
    const transaction = await sequelizeRepository_1.default.createTransaction(req);
    try {
        const database = await sequelizeRepository_1.default.getSequelize(req);
        const { agentInsights } = database.models;
        const insight = await agentInsights.findOne({
            where: { id, tenantId },
            transaction,
        });
        if (!insight) {
            throw new common_1.Error404('Insight not found');
        }
        const updates = {};
        if (status)
            updates.status = status;
        if (status === 'dismissed') {
            updates.dismissedAt = new Date();
            if (dismissedReason)
                updates.dismissedReason = dismissedReason;
        }
        await insight.update(updates, { transaction });
        await sequelizeRepository_1.default.commitTransaction(transaction);
        res.status(200).send(insight);
    }
    catch (error) {
        await sequelizeRepository_1.default.rollbackTransaction(transaction);
        log.error(error, '[InsightUpdate] Error updating insight');
        if (error instanceof common_1.Error404) {
            res.status(404).send(error.message);
        }
        else {
            res.status(500).send(error);
        }
    }
};
//# sourceMappingURL=insightUpdate.js.map