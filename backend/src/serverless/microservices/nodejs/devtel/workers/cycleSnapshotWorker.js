"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cycleSnapshotWorker = cycleSnapshotWorker;
/**
 * Cycle Snapshot Worker
 * Takes daily snapshots for burndown charts
 */
const logging_1 = require("@gitmesh/logging");
const log = (0, logging_1.getServiceChildLogger)('CycleSnapshotWorker');
async function cycleSnapshotWorker(message) {
    const { tenant, cycleId, projectId } = message;
    log.info({ cycleId, projectId }, 'Creating cycle snapshot');
    try {
        // Get current cycle stats
        const stats = await getCycleStats(tenant, cycleId);
        // Create snapshot record
        const snapshot = await createSnapshot(tenant, cycleId, stats);
        log.info({ cycleId, snapshot }, 'Cycle snapshot created');
        return snapshot;
    }
    catch (error) {
        log.error({ error, cycleId }, 'Cycle snapshot failed');
        throw error;
    }
}
async function getCycleStats(tenant, cycleId) {
    // TODO: Query devtelIssues for cycle stats
    // Sample query:
    // SELECT
    //   COUNT(*) as issueCount,
    //   SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completedIssueCount,
    //   SUM(CASE WHEN status IN ('in_progress', 'review') THEN 1 ELSE 0 END) as inProgressIssueCount,
    //   SUM(COALESCE(storyPoints, 0)) as totalPoints,
    //   SUM(CASE WHEN status = 'done' THEN COALESCE(storyPoints, 0) ELSE 0 END) as completedPoints
    // FROM devtelIssues
    // WHERE cycleId = :cycleId AND deletedAt IS NULL
    return {
        totalPoints: 0,
        remainingPoints: 0,
        completedPoints: 0,
        issueCount: 0,
        completedIssueCount: 0,
        inProgressIssueCount: 0,
    };
}
async function createSnapshot(tenant, cycleId, stats) {
    const today = new Date().toISOString().split('T')[0];
    // TODO: Create devtelCycleSnapshots record
    // Upsert to avoid duplicates for same day
    const snapshot = {
        cycleId,
        snapshotDate: today,
        totalPoints: stats.totalPoints,
        remainingPoints: stats.remainingPoints,
        completedPoints: stats.completedPoints,
        issueCount: stats.issueCount,
    };
    log.debug({ snapshot }, 'Snapshot record created');
    return snapshot;
}
//# sourceMappingURL=cycleSnapshotWorker.js.map