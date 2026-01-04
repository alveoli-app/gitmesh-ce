"use strict";
/**
 * Issues Bridge - Agent tools for issue operations
 * Called by Python CrewAI service
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateIssue = exports.createIssue = exports.getIssue = exports.searchIssues = void 0;
const sequelize_1 = require("sequelize");
/**
 * Search issues with filters
 */
const searchIssues = async (req, res) => {
    var _a, _b;
    const startTime = Date.now();
    const { tenantId, projectId, query, filters = {}, limit = 20 } = req.body;
    try {
        // Validate required fields
        if (!tenantId || !projectId) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['tenantId', 'projectId']
            });
        }
        const where = {
            projectId,
            deletedAt: null,
        };
        // Apply filters
        if ((_a = filters.status) === null || _a === void 0 ? void 0 : _a.length) {
            where.status = { [sequelize_1.Op.in]: filters.status };
        }
        if ((_b = filters.priority) === null || _b === void 0 ? void 0 : _b.length) {
            where.priority = { [sequelize_1.Op.in]: filters.priority };
        }
        if (filters.assigneeId) {
            where.assigneeId = filters.assigneeId;
        }
        if (filters.cycleId) {
            where.cycleId = filters.cycleId;
        }
        // Text search on title and description
        if (query) {
            where[sequelize_1.Op.or] = [
                { title: { [sequelize_1.Op.iLike]: `%${query}%` } },
                { description: { [sequelize_1.Op.iLike]: `%${query}%` } },
            ];
        }
        const issues = await req.database.devtelIssues.findAll({
            where,
            order: [['priority', 'ASC'], ['createdAt', 'DESC']],
            limit: Math.min(limit, 50),
            attributes: [
                'id', 'title', 'status', 'priority', 'type',
                'storyPoints', 'estimatedHours', 'assigneeId', 'cycleId'
            ],
            include: [
                {
                    model: req.database.user,
                    as: 'assignee',
                    attributes: ['id', 'fullName'],
                },
            ],
        });
        // Log the tool call
        await logToolCall(req, 'search_issues', { projectId, query, filters, limit }, {
            count: issues.length,
        }, Date.now() - startTime);
        return res.json({
            success: true,
            data: issues.map((i) => i.get({ plain: true })),
            count: issues.length,
        });
    }
    catch (error) {
        await logToolCall(req, 'search_issues', { projectId, query, filters }, {
            error: error.message,
        }, Date.now() - startTime, false);
        req.log.error({ error: error.message }, 'Agent bridge: search_issues failed');
        return res.status(500).json({ error: error.message });
    }
};
exports.searchIssues = searchIssues;
/**
 * Get a single issue by ID
 */
const getIssue = async (req, res) => {
    const startTime = Date.now();
    const { tenantId, issueId } = req.body;
    try {
        if (!issueId) {
            return res.status(400).json({ error: 'issueId is required' });
        }
        const issue = await req.database.devtelIssues.findOne({
            where: { id: issueId, deletedAt: null },
            include: [
                { model: req.database.user, as: 'assignee', attributes: ['id', 'fullName', 'email'] },
                { model: req.database.devtelCycles, as: 'cycle', attributes: ['id', 'name'] },
                {
                    model: req.database.devtelIssueComments,
                    as: 'comments',
                    limit: 10,
                    order: [['createdAt', 'DESC']],
                    include: [{ model: req.database.user, as: 'author', attributes: ['id', 'fullName'] }],
                },
            ],
        });
        if (!issue) {
            return res.status(404).json({ error: 'Issue not found' });
        }
        await logToolCall(req, 'get_issue', { issueId }, { found: true }, Date.now() - startTime);
        return res.json({
            success: true,
            data: issue.get({ plain: true }),
        });
    }
    catch (error) {
        await logToolCall(req, 'get_issue', { issueId }, { error: error.message }, Date.now() - startTime, false);
        req.log.error({ error: error.message }, 'Agent bridge: get_issue failed');
        return res.status(500).json({ error: error.message });
    }
};
exports.getIssue = getIssue;
/**
 * Create a new issue
 */
const createIssue = async (req, res) => {
    const startTime = Date.now();
    const { tenantId, userId, agentId, conversationId, projectId, title, description, priority, type, storyPoints, assigneeId, cycleId } = req.body;
    try {
        // Validate required fields
        if (!projectId || !title) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['projectId', 'title']
            });
        }
        // Validate project exists
        const project = await req.database.devtelProjects.findOne({
            where: { id: projectId, deletedAt: null }
        });
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        // Create the issue
        const issue = await req.database.devtelIssues.create({
            projectId,
            title,
            description: description || '',
            priority: priority || 'medium',
            type: type || 'task',
            status: 'backlog',
            storyPoints: storyPoints || null,
            assigneeId: assigneeId || null,
            cycleId: cycleId || null,
            createdById: userId,
            // Mark as created by AI agent
            metadata: {
                createdByAgent: true,
                agentId,
                conversationId,
            },
        });
        await logToolCall(req, 'create_issue', {
            projectId, title, priority, type
        }, {
            issueId: issue.id
        }, Date.now() - startTime);
        return res.json({
            success: true,
            data: issue.get({ plain: true }),
        });
    }
    catch (error) {
        await logToolCall(req, 'create_issue', { projectId, title }, {
            error: error.message
        }, Date.now() - startTime, false);
        req.log.error({ error: error.message }, 'Agent bridge: create_issue failed');
        return res.status(500).json({ error: error.message });
    }
};
exports.createIssue = createIssue;
/**
 * Update an existing issue
 */
const updateIssue = async (req, res) => {
    const startTime = Date.now();
    const { tenantId, userId, agentId, conversationId, issueId, updates } = req.body;
    try {
        if (!issueId) {
            return res.status(400).json({ error: 'issueId is required' });
        }
        const allowedFields = ['title', 'description', 'priority', 'status', 'storyPoints',
            'estimatedHours', 'assigneeId', 'cycleId', 'type'];
        const safeUpdates = {};
        for (const key of allowedFields) {
            if (updates && updates[key] !== undefined) {
                safeUpdates[key] = updates[key];
            }
        }
        if (Object.keys(safeUpdates).length === 0) {
            return res.status(400).json({ error: 'No valid updates provided' });
        }
        const issue = await req.database.devtelIssues.findOne({
            where: { id: issueId, deletedAt: null }
        });
        if (!issue) {
            return res.status(404).json({ error: 'Issue not found' });
        }
        // Store previous values for potential revert
        const previousValues = {};
        for (const key of Object.keys(safeUpdates)) {
            previousValues[key] = issue[key];
        }
        safeUpdates.updatedById = userId;
        await issue.update(safeUpdates);
        await logToolCall(req, 'update_issue', {
            issueId, updates: safeUpdates
        }, {
            previousValues,
            success: true
        }, Date.now() - startTime);
        return res.json({
            success: true,
            data: issue.get({ plain: true }),
            previousValues, // Return for potential revert
        });
    }
    catch (error) {
        await logToolCall(req, 'update_issue', { issueId, updates }, {
            error: error.message
        }, Date.now() - startTime, false);
        req.log.error({ error: error.message }, 'Agent bridge: update_issue failed');
        return res.status(500).json({ error: error.message });
    }
};
exports.updateIssue = updateIssue;
/**
 * Log tool calls for audit and telemetry
 */
async function logToolCall(req, toolName, parameters, response, durationMs, success = true) {
    try {
        await req.database.agentToolLogs.create({
            requestId: req.headers['x-request-id'] || null,
            toolName,
            parameters,
            response,
            statusCode: success ? 200 : 500,
            durationMs,
            agentId: req.body.agentId || null,
            conversationId: req.body.conversationId || null,
            tenantId: req.body.tenantId,
            timestamp: new Date(),
        });
    }
    catch (e) {
        req.log.warn({ error: e.message }, 'Failed to log tool call');
    }
}
//# sourceMappingURL=issuesBridge.js.map