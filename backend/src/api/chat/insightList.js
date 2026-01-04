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
    const { status, type, projectId, limit, offset } = req.query;
    log.info(`[InsightList] Listing insights for tenant ${tenantId}`);
    const transaction = await sequelizeRepository_1.default.createTransaction(req);
    try {
        const database = await sequelizeRepository_1.default.getSequelize(req);
        const { agentInsights } = database.models;
        const where = { tenantId };
        if (status)
            where.status = status;
        if (type)
            where.insightType = type;
        if (projectId)
            where.projectId = projectId;
        const insights = await agentInsights.findAndCountAll({
            where,
            limit: limit ? parseInt(limit, 10) : 50,
            offset: offset ? parseInt(offset, 10) : 0,
            order: [['createdAt', 'DESC']],
            transaction,
        });
        await sequelizeRepository_1.default.commitTransaction(transaction);
        res.status(200).send(insights);
    }
    catch (error) {
        await sequelizeRepository_1.default.rollbackTransaction(transaction);
        log.error(error, '[InsightList] Error listing insights');
        res.status(500).send(error);
    }
};
//# sourceMappingURL=insightList.js.map