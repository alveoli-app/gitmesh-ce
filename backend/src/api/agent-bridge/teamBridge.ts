/**
 * Team Bridge - Agent tools for team member operations
 */

import { Op } from 'sequelize'

/**
 * List team members for a project
 */
export const listTeamMembers = async (req, res) => {
    const startTime = Date.now()
    const { tenantId, projectId } = req.body

    try {
        if (!projectId) {
            return res.status(400).json({ error: 'projectId is required' })
        }

        // Get unique team members from assignments
        const assignees = await req.database.devtelIssues.findAll({
            where: { projectId, assigneeId: { [Op.ne]: null }, deletedAt: null },
            attributes: [[req.database.Sequelize.fn('DISTINCT', req.database.Sequelize.col('assigneeId')), 'assigneeId']],
            raw: true,
        })

        const userIds = assignees.map((a: any) => a.assigneeId)

        // Get project lead
        const project = await req.database.devtelProjects.findByPk(projectId, {
            attributes: ['leadUserId'],
        })

        if (project?.leadUserId && !userIds.includes(project.leadUserId)) {
            userIds.push(project.leadUserId)
        }

        const users = await req.database.user.findAll({
            where: { id: { [Op.in]: userIds } },
            attributes: ['id', 'fullName', 'email'],
        })

        // Get skills for each user
        const skills = await req.database.devtelUserSkills.findAll({
            where: { userId: { [Op.in]: userIds } },
            attributes: ['userId', 'skill', 'level'],
        })

        const skillsMap = new Map<string, any[]>()
        for (const skill of skills) {
            const userId = (skill as any).userId
            if (!skillsMap.has(userId)) skillsMap.set(userId, [])
            skillsMap.get(userId)!.push({ skill: (skill as any).skill, level: (skill as any).level })
        }

        const members = users.map((u: any) => ({
            userId: u.id,
            name: u.fullName,
            email: u.email,
            isLead: u.id === project?.leadUserId,
            skills: skillsMap.get(u.id) || [],
        }))

        await logToolCall(req, 'list_team_members', { projectId }, { count: members.length }, Date.now() - startTime)

        return res.json({ success: true, data: members })
    } catch (error: any) {
        await logToolCall(req, 'list_team_members', { projectId }, { error: error.message }, Date.now() - startTime, false)
        req.log.error({ error: error.message }, 'Agent bridge: list_team_members failed')
        return res.status(500).json({ error: error.message })
    }
}

/**
 * Suggest best assignee for an issue based on skills and capacity
 */
export const suggestAssignee = async (req, res) => {
    const startTime = Date.now()
    const { tenantId, issueId, projectId } = req.body

    try {
        if (!issueId) {
            return res.status(400).json({ error: 'issueId is required' })
        }

        const issue = await req.database.devtelIssues.findOne({
            where: { id: issueId, deletedAt: null },
            attributes: ['id', 'title', 'type', 'priority', 'projectId'],
        })

        if (!issue) {
            return res.status(404).json({ error: 'Issue not found' })
        }

        const targetProjectId = projectId || issue.projectId

        // Get team members with workload
        const assignees = await req.database.devtelIssues.findAll({
            where: {
                projectId: targetProjectId,
                assigneeId: { [Op.ne]: null },
                status: { [Op.notIn]: ['done', 'cancelled'] },
                deletedAt: null,
            },
            attributes: [
                'assigneeId',
                [req.database.Sequelize.fn('COUNT', '*'), 'issueCount'],
                [req.database.Sequelize.fn('SUM', req.database.Sequelize.col('estimatedHours')), 'totalHours'],
            ],
            group: ['assigneeId'],
            raw: true,
        })

        const workloadMap = new Map<string, { issueCount: number; totalHours: number }>()
        for (const a of assignees as any[]) {
            workloadMap.set(a.assigneeId, {
                issueCount: parseInt(a.issueCount) || 0,
                totalHours: parseInt(a.totalHours) || 0,
            })
        }

        // Get all team members
        const allAssignees = await req.database.devtelIssues.findAll({
            where: { projectId: targetProjectId, assigneeId: { [Op.ne]: null }, deletedAt: null },
            attributes: [[req.database.Sequelize.fn('DISTINCT', req.database.Sequelize.col('assigneeId')), 'assigneeId']],
            raw: true,
        })

        const userIds = (allAssignees as any[]).map(a => a.assigneeId)

        const users = await req.database.user.findAll({
            where: { id: { [Op.in]: userIds } },
            attributes: ['id', 'fullName', 'email'],
        })

        // Score each team member
        const candidates = users.map((u: any) => {
            const workload = workloadMap.get(u.id) || { issueCount: 0, totalHours: 0 }
            const capacityScore = Math.max(0, 100 - (workload.totalHours / 40 * 100)) // Higher = more available
            const balanceScore = Math.max(0, 100 - (workload.issueCount * 10)) // Fewer issues = higher

            return {
                userId: u.id,
                name: u.fullName,
                email: u.email,
                currentWorkload: {
                    issueCount: workload.issueCount,
                    totalHours: workload.totalHours,
                    utilizationPercent: Math.round(workload.totalHours / 40 * 100),
                },
                scores: {
                    capacity: Math.round(capacityScore),
                    balance: Math.round(balanceScore),
                    total: Math.round((capacityScore * 0.6) + (balanceScore * 0.4)),
                },
            }
        }).sort((a, b) => b.scores.total - a.scores.total)

        const suggestion = {
            issue: { id: issue.id, title: issue.title, type: issue.type },
            recommendation: candidates[0] || null,
            alternatives: candidates.slice(1, 4),
            reasoning: candidates[0]
                ? `${candidates[0].name} is recommended with ${candidates[0].currentWorkload.utilizationPercent}% capacity utilization and ${candidates[0].currentWorkload.issueCount} active issues.`
                : 'No available team members found.',
        }

        await logToolCall(req, 'suggest_assignee', { issueId }, {
            recommendedUserId: suggestion.recommendation?.userId,
        }, Date.now() - startTime)

        return res.json({ success: true, data: suggestion })
    } catch (error: any) {
        await logToolCall(req, 'suggest_assignee', { issueId }, { error: error.message }, Date.now() - startTime, false)
        req.log.error({ error: error.message }, 'Agent bridge: suggest_assignee failed')
        return res.status(500).json({ error: error.message })
    }
}

async function logToolCall(req: any, toolName: string, parameters: any, response: any, durationMs: number, success = true) {
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
        })
    } catch (e) {
        req.log.warn({ error: (e as Error).message }, 'Failed to log tool call')
    }
}
