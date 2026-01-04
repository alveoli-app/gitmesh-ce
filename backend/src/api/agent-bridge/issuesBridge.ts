/**
 * Issues Bridge - Agent tools for issue operations
 * Called by Python CrewAI service
 */

import { Op } from 'sequelize'

interface ToolRequest {
    tenantId: string
    userId: string
    conversationId?: string
    agentId?: string
}

/**
 * Search issues with filters
 */
export const searchIssues = async (req, res) => {
    const startTime = Date.now()
    const { tenantId, projectId, query, filters = {}, limit = 20 } = req.body as ToolRequest & {
        projectId: string
        query?: string
        filters?: {
            status?: string[]
            priority?: string[]
            assigneeId?: string
            cycleId?: string
        }
        limit?: number
    }

    try {
        // Validate required fields
        if (!tenantId || !projectId) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['tenantId', 'projectId']
            })
        }

        const where: any = {
            projectId,
            deletedAt: null,
        }

        // Apply filters
        if (filters.status?.length) {
            where.status = { [Op.in]: filters.status }
        }

        if (filters.priority?.length) {
            where.priority = { [Op.in]: filters.priority }
        }

        if (filters.assigneeId) {
            where.assigneeId = filters.assigneeId
        }

        if (filters.cycleId) {
            where.cycleId = filters.cycleId
        }

        // Text search on title and description
        if (query) {
            where[Op.or] = [
                { title: { [Op.iLike]: `%${query}%` } },
                { description: { [Op.iLike]: `%${query}%` } },
            ]
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
        })

        // Log the tool call
        await logToolCall(req, 'search_issues', { projectId, query, filters, limit }, {
            count: issues.length,
        }, Date.now() - startTime)

        return res.json({
            success: true,
            data: issues.map((i: any) => i.get({ plain: true })),
            count: issues.length,
        })
    } catch (error: any) {
        await logToolCall(req, 'search_issues', { projectId, query, filters }, {
            error: error.message,
        }, Date.now() - startTime, false)

        req.log.error({ error: error.message }, 'Agent bridge: search_issues failed')
        return res.status(500).json({ error: error.message })
    }
}

/**
 * Get a single issue by ID
 */
export const getIssue = async (req, res) => {
    const startTime = Date.now()
    const { tenantId, issueId } = req.body as ToolRequest & { issueId: string }

    try {
        if (!issueId) {
            return res.status(400).json({ error: 'issueId is required' })
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
        })

        if (!issue) {
            return res.status(404).json({ error: 'Issue not found' })
        }

        await logToolCall(req, 'get_issue', { issueId }, { found: true }, Date.now() - startTime)

        return res.json({
            success: true,
            data: issue.get({ plain: true }),
        })
    } catch (error: any) {
        await logToolCall(req, 'get_issue', { issueId }, { error: error.message }, Date.now() - startTime, false)
        req.log.error({ error: error.message }, 'Agent bridge: get_issue failed')
        return res.status(500).json({ error: error.message })
    }
}

/**
 * Create a new issue
 */
export const createIssue = async (req, res) => {
    const startTime = Date.now()
    const {
        tenantId, userId, agentId, conversationId,
        projectId, title, description, priority, type, storyPoints, assigneeId, cycleId
    } = req.body

    try {
        // Validate required fields
        if (!projectId || !title) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['projectId', 'title']
            })
        }

        // Validate project exists
        const project = await req.database.devtelProjects.findOne({
            where: { id: projectId, deletedAt: null }
        })

        if (!project) {
            return res.status(404).json({ error: 'Project not found' })
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
        })

        await logToolCall(req, 'create_issue', {
            projectId, title, priority, type
        }, {
            issueId: issue.id
        }, Date.now() - startTime)

        return res.json({
            success: true,
            data: issue.get({ plain: true }),
        })
    } catch (error: any) {
        await logToolCall(req, 'create_issue', { projectId, title }, {
            error: error.message
        }, Date.now() - startTime, false)

        req.log.error({ error: error.message }, 'Agent bridge: create_issue failed')
        return res.status(500).json({ error: error.message })
    }
}

/**
 * Update an existing issue
 */
export const updateIssue = async (req, res) => {
    const startTime = Date.now()
    const {
        tenantId, userId, agentId, conversationId,
        issueId, updates
    } = req.body

    try {
        if (!issueId) {
            return res.status(400).json({ error: 'issueId is required' })
        }

        const allowedFields = ['title', 'description', 'priority', 'status', 'storyPoints',
            'estimatedHours', 'assigneeId', 'cycleId', 'type']

        const safeUpdates: any = {}
        for (const key of allowedFields) {
            if (updates && updates[key] !== undefined) {
                safeUpdates[key] = updates[key]
            }
        }

        if (Object.keys(safeUpdates).length === 0) {
            return res.status(400).json({ error: 'No valid updates provided' })
        }

        const issue = await req.database.devtelIssues.findOne({
            where: { id: issueId, deletedAt: null }
        })

        if (!issue) {
            return res.status(404).json({ error: 'Issue not found' })
        }

        // Store previous values for potential revert
        const previousValues: any = {}
        for (const key of Object.keys(safeUpdates)) {
            previousValues[key] = issue[key]
        }

        safeUpdates.updatedById = userId

        await issue.update(safeUpdates)

        await logToolCall(req, 'update_issue', {
            issueId, updates: safeUpdates
        }, {
            previousValues,
            success: true
        }, Date.now() - startTime)

        return res.json({
            success: true,
            data: issue.get({ plain: true }),
            previousValues,  // Return for potential revert
        })
    } catch (error: any) {
        await logToolCall(req, 'update_issue', { issueId, updates }, {
            error: error.message
        }, Date.now() - startTime, false)

        req.log.error({ error: error.message }, 'Agent bridge: update_issue failed')
        return res.status(500).json({ error: error.message })
    }
}

/**
 * Log tool calls for audit and telemetry
 */
async function logToolCall(
    req: any,
    toolName: string,
    parameters: any,
    response: any,
    durationMs: number,
    success: boolean = true
) {
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
        })
    } catch (e) {
        req.log.warn({ error: (e as Error).message }, 'Failed to log tool call')
    }
}
