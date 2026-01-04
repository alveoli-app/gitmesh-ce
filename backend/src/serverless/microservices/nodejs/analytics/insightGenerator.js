"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processGenerateInsights = void 0;
const axios_1 = __importDefault(require("axios"));
const logging_1 = require("@gitmesh/logging");
const processGenerateInsights = async (msg) => {
    const log = (0, logging_1.getServiceLogger)();
    const { tenant, projectId } = msg;
    log.info(`[InsightGenerator] Starting analysis for project ${projectId} (Tenant: ${tenant})`);
    try {
        // Call Chat Orchestrator to run the Insight Crew
        const orchestratorUrl = process.env.CHAT_ORCHESTRATOR_URL || 'http://localhost:8001';
        const response = await axios_1.default.post(`${orchestratorUrl}/agents/analyze`, {
            tenantId: tenant,
            projectId: projectId,
            type: 'scheduled'
        });
        const insights = response.data;
        if (insights && insights.length > 0) {
            // Lazy load database connection
            const { databaseInit } = require('../../../../database/databaseConnection');
            const database = await databaseInit();
            const { agentInsights } = database.models;
            for (const insight of insights) {
                // Check if similar insight exists to avoid duplicates (based on title/type/active)
                const existing = await agentInsights.findOne({
                    where: {
                        tenantId: tenant,
                        projectId: projectId,
                        title: insight.title,
                        status: 'active'
                    }
                });
                if (!existing) {
                    await agentInsights.create({
                        tenantId: tenant,
                        projectId: projectId,
                        agentId: 'insight-crew',
                        insightType: insight.insightType,
                        severity: insight.severity,
                        title: insight.title,
                        description: insight.description,
                        affectedEntities: insight.affectedEntities,
                        suggestedActions: insight.suggestedActions,
                        confidence: insight.confidence,
                        category: insight.category,
                        status: 'active'
                    });
                }
            }
            log.info(`[InsightGenerator] Saved ${insights.length} insights for project ${projectId}`);
        }
        else {
            log.info(`[InsightGenerator] No insights generated for project ${projectId}`);
        }
    }
    catch (err) {
        log.error(err, `[InsightGenerator] Failed to analyze project ${projectId}`);
        throw err;
    }
};
exports.processGenerateInsights = processGenerateInsights;
//# sourceMappingURL=insightGenerator.js.map