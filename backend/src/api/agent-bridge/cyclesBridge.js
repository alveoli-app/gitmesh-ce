"use strict";
/**
 * Cycles Bridge - Agent tools for cycle/sprint operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCycleMetrics = exports.getActiveCycle = exports.listCycles = void 0;
/**
 * List cycles for a project
 */
const listCycles = async (req, res) => {
    const startTime = Date.now();
    const { tenantId, projectId, status, limit = 10 } = req.body;
    try {
        if (!projectId) {
            return res.status(400).json({ error: 'projectId is required' });
        }
        const where = { projectId, deletedAt: null };
        if (status) {
            where.status = status;
        }
        const cycles = await req.database.devtelCycles.findAll({
            where,
            order: [['startDate', 'DESC']],
            limit: Math.min(limit, 20),
            attributes: ['id', 'name', 'status', 'startDate', 'endDate', 'goal'],
        });
        await logToolCall(req, 'list_cycles', { projectId, status }, { count: cycles.length }, Date.now() - startTime);
        return res.json({
            success: true,
            data: cycles.map((c) => c.get({ plain: true })),
        });
    }
    catch (error) {
        await logToolCall(req, 'list_cycles', { projectId }, { error: error.message }, Date.now() - startTime, false);
        req.log.error({ error: error.message }, 'Agent bridge: list_cycles failed');
        return res.status(500).json({ error: error.message });
    }
};
exports.listCycles = listCycles;
/**
 * Get active cycle for a project
 */
const getActiveCycle = async (req, res) => {
    const startTime = Date.now();
    const { tenantId, projectId } = req.body;
    try {
        if (!projectId) {
            return res.status(400).json({ error: 'projectId is required' });
        }
        const cycle = await req.database.devtelCycles.findOne({
            where: {
                projectId,
                status: 'active',
                deletedAt: null
            },
            include: [{
                    model: req.database.devtelIssues,
                    as: 'issues',
                    where: { deletedAt: null },
                    required: false,
                    attributes: ['id', 'status', 'priority', 'storyPoints', 'assigneeId'],
                }],
        });
        if (!cycle) {
            return res.json({ success: true, data: null, message: 'No active cycle found' });
        }
        await logToolCall(req, 'get_active_cycle', { projectId }, { cycleId: cycle.id }, Date.now() - startTime);
        return res.json({
            success: true,
            data: cycle.get({ plain: true }),
        });
    }
    catch (error) {
        await logToolCall(req, 'get_active_cycle', { projectId }, { error: error.message }, Date.now() - startTime, false);
        req.log.error({ error: error.message }, 'Agent bridge: get_active_cycle failed');
        return res.status(500).json({ error: error.message });
    }
};
exports.getActiveCycle = getActiveCycle;
/**
 * Get cycle metrics (velocity, burndown, etc.)
 */
const getCycleMetrics = async (req, res) => {
    const startTime = Date.now();
    const { tenantId, cycleId } = req.body;
    try {
        if (!cycleId) {
            return res.status(400).json({ error: 'cycleId is required' });
        }
        const cycle = await req.database.devtelCycles.findOne({
            where: { id: cycleId, deletedAt: null },
            include: [{
                    model: req.database.devtelIssues,
                    as: 'issues',
                    where: { deletedAt: null },
                    required: false,
                    attributes: ['id', 'status', 'priority', 'storyPoints', 'estimatedHours', 'type'],
                }],
        });
        if (!cycle) {
            return res.status(404).json({ error: 'Cycle not found' });
        }
        const issues = cycle.issues || [];
        // Calculate metrics
        const totalIssues = issues.length;
        const byStatus = {
            backlog: issues.filter((i) => i.status === 'backlog').length,
            todo: issues.filter((i) => i.status === 'todo').length,
            in_progress: issues.filter((i) => i.status === 'in_progress').length,
            review: issues.filter((i) => i.status === 'review').length,
            done: issues.filter((i) => i.status === 'done').length,
        };
        const totalPoints = issues.reduce((sum, i) => sum + (i.storyPoints || 0), 0);
        const completedPoints = issues
            .filter((i) => i.status === 'done')
            .reduce((sum, i) => sum + (i.storyPoints || 0), 0);
        const totalHours = issues.reduce((sum, i) => sum + (i.estimatedHours || 0), 0);
        const completedHours = issues
            .filter((i) => i.status === 'done')
            .reduce((sum, i) => sum + (i.estimatedHours || 0), 0);
        // Calculate days info
        const startDate = new Date(cycle.startDate);
        const endDate = new Date(cycle.endDate);
        const now = new Date();
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysElapsed = Math.max(0, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
        const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        // Health indicators
        const progressPercent = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;
        const expectedProgress = totalDays > 0 ? Math.round((daysElapsed / totalDays) * 100) : 0;
        const isOnTrack = progressPercent >= (expectedProgress - 10);
        const metrics = {
            cycleId: cycle.id,
            cycleName: cycle.name,
            status: cycle.status,
            dates: {
                start: cycle.startDate,
                end: cycle.endDate,
                totalDays,
                daysElapsed,
                daysRemaining,
            },
            issues: {
                total: totalIssues,
                byStatus,
            },
            points: {
                total: totalPoints,
                completed: completedPoints,
                remaining: totalPoints - completedPoints,
                progressPercent,
            },
            hours: {
                total: totalHours,
                completed: completedHours,
                remaining: totalHours - completedHours,
            },
            health: {
                isOnTrack,
                expectedProgress,
                actualProgress: progressPercent,
                velocityEstimate: daysElapsed > 0 ? Math.round(completedPoints / daysElapsed * 7) : 0, // Points per week
            },
        };
        await logToolCall(req, 'get_cycle_metrics', { cycleId }, {
            totalIssues,
            progressPercent,
            isOnTrack
        }, Date.now() - startTime);
        return res.json({
            success: true,
            data: metrics,
        });
    }
    catch (error) {
        await logToolCall(req, 'get_cycle_metrics', { cycleId }, { error: error.message }, Date.now() - startTime, false);
        req.log.error({ error: error.message }, 'Agent bridge: get_cycle_metrics failed');
        return res.status(500).json({ error: error.message });
    }
};
exports.getCycleMetrics = getCycleMetrics;
async function logToolCall(req, toolName, parameters, response, durationMs, success = true) {
    try {
        await req.database.agentToolLogs.create({
            requestId: req.headers['x-request-id'],
            toolName,
            parameters,
            response,
            statusCode: success ? 200 : 500,
            durationMs,
            agentId: req.body.agentId,
            conversationId: req.body.conversationId,
            tenantId: req.body.tenantId,
            timestamp: new Date(),
        });
    }
    catch (e) {
        req.log.warn({ error: e.message }, 'Failed to log tool call');
    }
}
//# sourceMappingURL=cyclesBridge.js.map