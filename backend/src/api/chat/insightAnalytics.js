"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logging_1 = require("@gitmesh/logging");
const sequelizeRepository_1 = __importDefault(require("../../database/repositories/sequelizeRepository"));
exports.default = async (req, res) => {
    const log = (0, logging_1.getServiceLogger)();
    const { tenantId } = req.params;
    const { range } = req.query; // e.g., '7d', '30d'
    log.info(`[InsightAnalytics] Getting analytics for tenant ${tenantId}`);
    const transaction = await sequelizeRepository_1.default.createTransaction(req);
    try {
        const database = await sequelizeRepository_1.default.getSequelize(req);
        // Safety check just in case, though usually this is raw SQL or ORM aggregations
        // We'll use simple counts for now
        const { agentInsights } = database.models;
        const totalCount = await agentInsights.count({ where: { tenantId }, transaction });
        // Group by status
        const statusDistribution = await agentInsights.findAll({
            attributes: ['status', [database.fn('COUNT', database.col('id')), 'count']],
            where: { tenantId },
            group: ['status'],
            raw: true,
            transaction
        });
        // Group by category
        const categoryDistribution = await agentInsights.findAll({
            attributes: ['category', [database.fn('COUNT', database.col('id')), 'count']],
            where: { tenantId },
            group: ['category'],
            raw: true,
            transaction
        });
        // Group by severity
        const severityDistribution = await agentInsights.findAll({
            attributes: ['severity', [database.fn('COUNT', database.col('id')), 'count']],
            where: { tenantId },
            group: ['severity'],
            raw: true,
            transaction
        });
        await sequelizeRepository_1.default.commitTransaction(transaction);
        res.status(200).send({
            total: totalCount,
            byStatus: statusDistribution,
            byCategory: categoryDistribution,
            bySeverity: severityDistribution
        });
    }
    catch (error) {
        await sequelizeRepository_1.default.rollbackTransaction(transaction);
        log.error(error, '[InsightAnalytics] Error getting analytics');
        res.status(500).send(error);
    }
};
//# sourceMappingURL=insightAnalytics.js.map