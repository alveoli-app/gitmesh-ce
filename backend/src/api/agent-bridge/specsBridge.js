"use strict";
/**
 * Specs Bridge - Agent tools for specification document operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSpec = exports.createSpec = exports.listSpecs = void 0;
/**
 * List specs for a project
 */
const listSpecs = async (req, res) => {
    const startTime = Date.now();
    const { tenantId, projectId, status, limit = 20 } = req.body;
    try {
        if (!projectId) {
            return res.status(400).json({ error: 'projectId is required' });
        }
        const where = { projectId, deletedAt: null };
        if (status)
            where.status = status;
        const specs = await req.database.devtelSpecDocuments.findAll({
            where,
            order: [['updatedAt', 'DESC']],
            limit: Math.min(limit, 50),
            attributes: ['id', 'title', 'status', 'authorId', 'createdAt', 'updatedAt'],
            include: [
                { model: req.database.user, as: 'author', attributes: ['id', 'fullName'] },
            ],
        });
        await logToolCall(req, 'list_specs', { projectId, status }, { count: specs.length }, Date.now() - startTime);
        return res.json({
            success: true,
            data: specs.map((s) => s.get({ plain: true })),
        });
    }
    catch (error) {
        await logToolCall(req, 'list_specs', { projectId }, { error: error.message }, Date.now() - startTime, false);
        req.log.error({ error: error.message }, 'Agent bridge: list_specs failed');
        return res.status(500).json({ error: error.message });
    }
};
exports.listSpecs = listSpecs;
/**
 * Create a new spec
 */
const createSpec = async (req, res) => {
    const startTime = Date.now();
    const { tenantId, userId, agentId, projectId, title, content } = req.body;
    try {
        if (!projectId || !title || !content) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['projectId', 'title', 'content']
            });
        }
        const spec = await req.database.devtelSpecDocuments.create({
            projectId,
            title,
            content,
            status: 'draft',
            authorId: userId,
            metadata: { createdByAgent: true, agentId },
        });
        // Create initial version
        await req.database.devtelSpecVersions.create({
            specId: spec.id,
            content,
            version: 1,
            authorId: userId,
            changeLog: 'Initial draft created by AI agent',
        });
        await logToolCall(req, 'create_spec', { projectId, title }, { specId: spec.id }, Date.now() - startTime);
        return res.json({
            success: true,
            data: spec.get({ plain: true }),
        });
    }
    catch (error) {
        await logToolCall(req, 'create_spec', { projectId, title }, { error: error.message }, Date.now() - startTime, false);
        req.log.error({ error: error.message }, 'Agent bridge: create_spec failed');
        return res.status(500).json({ error: error.message });
    }
};
exports.createSpec = createSpec;
/**
 * Update a spec
 */
const updateSpec = async (req, res) => {
    const startTime = Date.now();
    const { tenantId, userId, agentId, specId, updates, changeLog } = req.body;
    try {
        if (!specId) {
            return res.status(400).json({ error: 'specId is required' });
        }
        const spec = await req.database.devtelSpecDocuments.findOne({
            where: { id: specId, deletedAt: null }
        });
        if (!spec) {
            return res.status(404).json({ error: 'Spec not found' });
        }
        const allowedFields = ['title', 'content', 'status'];
        const safeUpdates = {};
        for (const key of allowedFields) {
            if (updates && updates[key] !== undefined) {
                safeUpdates[key] = updates[key];
            }
        }
        // If content changed, create new version
        if (safeUpdates.content && safeUpdates.content !== spec.content) {
            const latestVersion = await req.database.devtelSpecVersions.findOne({
                where: { specId },
                order: [['version', 'DESC']],
            });
            await req.database.devtelSpecVersions.create({
                specId,
                content: safeUpdates.content,
                version: ((latestVersion === null || latestVersion === void 0 ? void 0 : latestVersion.version) || 0) + 1,
                authorId: userId,
                changeLog: changeLog || 'Updated by AI agent',
            });
        }
        await spec.update(safeUpdates);
        await logToolCall(req, 'update_spec', { specId, updates: Object.keys(safeUpdates) }, { success: true }, Date.now() - startTime);
        return res.json({ success: true, data: spec.get({ plain: true }) });
    }
    catch (error) {
        await logToolCall(req, 'update_spec', { specId }, { error: error.message }, Date.now() - startTime, false);
        req.log.error({ error: error.message }, 'Agent bridge: update_spec failed');
        return res.status(500).json({ error: error.message });
    }
};
exports.updateSpec = updateSpec;
async function logToolCall(req, toolName, parameters, response, durationMs, success = true) {
    try {
        await req.database.agentToolLogs.create({
            requestId: req.headers['x-request-id'],
            toolName, parameters, response,
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
//# sourceMappingURL=specsBridge.js.map