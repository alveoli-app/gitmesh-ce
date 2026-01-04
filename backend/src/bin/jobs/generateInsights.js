"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cron_time_generator_1 = __importDefault(require("cron-time-generator"));
const logging_1 = require("@gitmesh/logging");
const databaseConnection_1 = require("../../database/databaseConnection");
const nodeWorkerSQS_1 = require("../../serverless/utils/nodeWorkerSQS");
const workerTypes_1 = require("../../serverless/types/workerTypes");
const job = {
    name: 'Generate Insights',
    // every 4 hours
    cronTime: cron_time_generator_1.default.every(4).hours(),
    onTrigger: async () => {
        const log = (0, logging_1.getServiceLogger)();
        const database = await (0, databaseConnection_1.databaseInit)();
        // Fetch all active tenants
        const tenants = await database.tenant.findAll({
            attributes: ['id'],
        });
        log.info(`[GenerateInsights] Found ${tenants.length} tenants.`);
        for (const tenant of tenants) {
            // Fetch all active devtel projects for this tenant
            // We assume projects are relevant entities for analysis
            const projects = await database.devtelProjects.findAll({
                where: {
                    tenantId: tenant.id,
                    // Add status check if applicable, assuming default/all for now or active
                },
                attributes: ['id'],
            });
            log.info(`[GenerateInsights] Tenant ${tenant.id}: Found ${projects.length} projects.`);
            for (const project of projects) {
                await (0, nodeWorkerSQS_1.sendNodeWorkerMessage)(tenant.id, {
                    type: workerTypes_1.NodeWorkerMessageType.GENERATE_INSIGHTS,
                    tenant: tenant.id,
                    projectId: project.id,
                });
            }
        }
    },
};
exports.default = job;
//# sourceMappingURL=generateInsights.js.map