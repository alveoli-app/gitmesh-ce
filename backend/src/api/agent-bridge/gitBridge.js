"use strict";
/**
 * Git Bridge
 * Exposes git activity data for agents
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentPRs = exports.getRecentCommits = void 0;
const activityService_1 = __importDefault(require("../../services/activityService"));
const getRecentCommits = async (req, res) => {
    const { projectId, limit = 10, days = 7 } = req.body;
    try {
        const activityService = new activityService_1.default(req);
        // Calculate date range
        const since = new Date();
        since.setDate(since.getDate() - days);
        // Build query for commit activities
        // Note: In real implementation, w'd filter by projectId's integration linkage
        // For now assuming we filter by current tenant context
        const activities = await activityService.findAndCountAll({
            filter: {
                type: 'commit',
                timestamp: {
                    $gte: since,
                }
            },
            limit,
            orderBy: [['timestamp', 'DESC']],
        });
        const formatted = activities.rows.map(a => {
            var _a, _b;
            return ({
                message: a.title,
                author: ((_a = a.opt) === null || _a === void 0 ? void 0 : _a.authorName) || 'Unknown',
                sha: a.sourceId,
                date: a.timestamp,
                branch: (_b = a.opt) === null || _b === void 0 ? void 0 : _b.branch,
            });
        });
        await req.database.agentToolLogs.create({
            tenantId: req.currentUser.tenantId,
            agentName: 'system',
            toolName: 'get_recent_commits',
            parameters: { projectId, limit, days },
            success: true,
            durationMs: 0,
        });
        res.json({ data: formatted });
    }
    catch (error) {
        req.log.error('Failed to get recent commits:', error);
        res.status(500).json({ error: 'Failed to get recent commits' });
    }
};
exports.getRecentCommits = getRecentCommits;
const getRecentPRs = async (req, res) => {
    const { projectId, status = 'open', limit = 10 } = req.body;
    try {
        const activityService = new activityService_1.default(req);
        // Find PR activities
        const activities = await activityService.findAndCountAll({
            filter: {
                type: 'pullRequest',
                // In reality, status filter might be in 'opt' jsonb column or distinct type
            },
            limit,
            orderBy: [['timestamp', 'DESC']],
        });
        const formatted = activities.rows.map(a => {
            var _a, _b;
            return ({
                title: a.title,
                author: ((_a = a.opt) === null || _a === void 0 ? void 0 : _a.authorName) || 'Unknown',
                status: ((_b = a.opt) === null || _b === void 0 ? void 0 : _b.state) || 'open',
                url: a.url,
                date: a.timestamp,
            });
        });
        await req.database.agentToolLogs.create({
            tenantId: req.currentUser.tenantId,
            agentName: 'system',
            toolName: 'get_recent_prs',
            parameters: { projectId, status, limit },
            success: true,
            durationMs: 0,
        });
        res.json({ data: formatted });
    }
    catch (error) {
        req.log.error('Failed to get recent PRs:', error);
        res.status(500).json({ error: 'Failed to get recent PRs' });
    }
};
exports.getRecentPRs = getRecentPRs;
//# sourceMappingURL=gitBridge.js.map