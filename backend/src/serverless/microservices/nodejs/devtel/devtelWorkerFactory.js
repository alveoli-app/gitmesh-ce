"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.devtelWorkerFactory = devtelWorkerFactory;
/**
 * DevTel Worker Factory
 * Dispatches DevTel background jobs to appropriate handlers
 */
const logging_1 = require("@gitmesh/logging");
const syncExternalDataWorker_1 = require("./workers/syncExternalDataWorker");
const indexToOpensearchWorker_1 = require("./workers/indexToOpensearchWorker");
const calculateMetricsWorker_1 = require("./workers/calculateMetricsWorker");
const agentTaskWorker_1 = require("./workers/agentTaskWorker");
const cycleSnapshotWorker_1 = require("./workers/cycleSnapshotWorker");
const log = (0, logging_1.getServiceChildLogger)('DevtelWorkerFactory');
async function devtelWorkerFactory(message) {
    const { service } = message;
    log.info({ service }, 'Processing DevTel worker message');
    switch (service) {
        case 'devtel-sync-external':
            return (0, syncExternalDataWorker_1.syncExternalDataWorker)(message);
        case 'devtel-index-opensearch':
            return (0, indexToOpensearchWorker_1.indexToOpensearchWorker)(message);
        case 'devtel-calculate-metrics':
            return (0, calculateMetricsWorker_1.calculateMetricsWorker)(message);
        case 'devtel-agent-task':
            return (0, agentTaskWorker_1.agentTaskWorker)(message);
        case 'devtel-cycle-snapshot':
            return (0, cycleSnapshotWorker_1.cycleSnapshotWorker)(message);
        default:
            throw new Error(`Unknown DevTel service: ${service}`);
    }
}
exports.default = devtelWorkerFactory;
//# sourceMappingURL=devtelWorkerFactory.js.map