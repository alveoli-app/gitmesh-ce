/**
 * Capacity Bridge - Agent tools for team capacity operations
 */

import { Op } from 'sequelize'

/**
 * Get capacity overview for a project
 */
export const getCapacityOverview = async (req, res) => {
    const startTime = Date.now()
    const { tenantId, projectId } = req.body

    try {
        if (!projectId) {
            return res.status(400).json({ error: 'projectId is required' })
        }

        // Get all team members with their assigned issues
        const members = await getTeamMembersWithWorkload(req, projectId)

        // Calculate team stats
        const totalCapacity = members.reduce((sum, m) => sum + (m.weeklyCapacity || 40), 0)
        const totalAllocated = members.reduce((sum, m) => sum + m.allocatedHours, 0)
        const utilizationPercent = totalCapacity > 0 ? Math.round((totalAllocated / totalCapacity) * 100) : 0

        const capacityOverview = {
            projectId,
            team: {
                memberCount: members.length,
                totalCapacity,
                totalAllocated,
                availableCapacity: Math.max(0, totalCapacity - totalAllocated),
                utilizationPercent,
            },
            members: members.map(m => ({
                userId: m.userId,
                name: m.name,
                email: m.email,
                weeklyCapacity: m.weeklyCapacity || 40,
                allocatedHours: m.allocatedHours,
                allocatedPoints: m.allocatedPoints,
                assignedIssues: m.assignedIssues,
                inProgressIssues: m.inProgressIssues,
                utilizationPercent: m.utilizationPercent,
                isOverallocated: m.isOverallocated,
            })),
            warnings: members
                .filter(m => m.isOverallocated)
                .map(m => ({
                    userId: m.userId,
                    name: m.name,
                    message: `${m.name} is overallocated at ${m.utilizationPercent}% capacity`,
                    severity: m.utilizationPercent > 120 ? 'critical' : 'warning',
                })),
        }

        await logToolCall(req, 'get_capacity_overview', { projectId }, {
            memberCount: members.length,
            utilizationPercent,
            overallocatedCount: capacityOverview.warnings.length,
        }, Date.now() - startTime)

        return res.json({
            success: true,
            data: capacityOverview,
        })
    } catch (error: any) {
        await logToolCall(req, 'get_capacity_overview', { projectId }, { error: error.message }, Date.now() - startTime, false)
        req.log.error({ error: error.message }, 'Agent bridge: get_capacity_overview failed')
        return res.status(500).json({ error: error.message })
    }
}

/**
 * Get workload for a specific member
 */
export const getMemberWorkload = async (req, res) => {
    const startTime = Date.now()
    const { tenantId, userId, projectId } = req.body

    try {
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' })
        }

        // Get user info
        const user = await req.database.user.findByPk(userId, {
            attributes: ['id', 'fullName', 'email'],
        })

        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        }

        // Get assigned issues
        const where: any = {
            assigneeId: userId,
            status: { [Op.notIn]: ['done', 'cancelled'] },
            deletedAt: null,
        }

        if (projectId) {
            where.projectId = projectId
        }

        const issues = await req.database.devtelIssues.findAll({
            where,
            attributes: ['id', 'title', 'status', 'priority', 'storyPoints', 'estimatedHours', 'type'],
            include: [
                { model: req.database.devtelProjects, as: 'project', attributes: ['id', 'name'] },
                { model: req.database.devtelCycles, as: 'cycle', attributes: ['id', 'name', 'endDate'] },
            ],
            order: [['priority', 'ASC'], ['createdAt', 'ASC']],
        })

        const allocatedHours = issues.reduce((sum, i: any) => sum + (i.estimatedHours || 4), 0)
        const allocatedPoints = issues.reduce((sum, i: any) => sum + (i.storyPoints || 0), 0)

        // Group by priority
        const byPriority = {
            critical: issues.filter((i: any) => i.priority === 'critical'),
            high: issues.filter((i: any) => i.priority === 'high'),
            medium: issues.filter((i: any) => i.priority === 'medium'),
            low: issues.filter((i: any) => i.priority === 'low'),
        }

        const workload = {
            userId: user.id,
            name: user.fullName,
            email: user.email,
            weeklyCapacity: 40, // Default, could be from user settings
            allocatedHours,
            allocatedPoints,
            utilizationPercent: Math.round((allocatedHours / 40) * 100),
            isOverallocated: allocatedHours > 40,
            issues: {
                total: issues.length,
                byStatus: {
                    todo: issues.filter((i: any) => i.status === 'todo').length,
                    in_progress: issues.filter((i: any) => i.status === 'in_progress').length,
                    review: issues.filter((i: any) => i.status === 'review').length,
                },
                byPriority: {
                    critical: byPriority.critical.length,
                    high: byPriority.high.length,
                    medium: byPriority.medium.length,
                    low: byPriority.low.length,
                },
                list: issues.slice(0, 20).map((i: any) => i.get({ plain: true })),
            },
            urgentItems: byPriority.critical.concat(byPriority.high).slice(0, 5).map((i: any) => ({
                id: i.id,
                title: i.title,
                priority: i.priority,
                dueDate: i.cycle?.endDate,
            })),
        }

        await logToolCall(req, 'get_member_workload', { userId, projectId }, {
            issueCount: issues.length,
            utilizationPercent: workload.utilizationPercent,
        }, Date.now() - startTime)

        return res.json({
            success: true,
            data: workload,
        })
    } catch (error: any) {
        await logToolCall(req, 'get_member_workload', { userId }, { error: error.message }, Date.now() - startTime, false)
        req.log.error({ error: error.message }, 'Agent bridge: get_member_workload failed')
        return res.status(500).json({ error: error.message })
    }
}

/**
 * Check for overallocated team members
 */
export const checkOverallocation = async (req, res) => {
    const startTime = Date.now()
    const { tenantId, projectId, threshold = 100 } = req.body

    try {
        if (!projectId) {
            return res.status(400).json({ error: 'projectId is required' })
        }

        const members = await getTeamMembersWithWorkload(req, projectId)

        const overallocated = members
            .filter(m => m.utilizationPercent >= threshold)
            .sort((a, b) => b.utilizationPercent - a.utilizationPercent)

        const result = {
            projectId,
            threshold,
            overallocatedCount: overallocated.length,
            totalMembers: members.length,
            overallocatedMembers: overallocated.map(m => ({
                userId: m.userId,
                name: m.name,
                utilizationPercent: m.utilizationPercent,
                allocatedHours: m.allocatedHours,
                weeklyCapacity: m.weeklyCapacity,
                excessHours: m.allocatedHours - m.weeklyCapacity,
                assignedIssues: m.assignedIssues,
                recommendation: generateRecommendation(m),
            })),
            healthySummary: {
                underutilized: members.filter(m => m.utilizationPercent < 70).length,
                optimal: members.filter(m => m.utilizationPercent >= 70 && m.utilizationPercent < 100).length,
                atCapacity: members.filter(m => m.utilizationPercent >= 100 && m.utilizationPercent < 120).length,
                critical: members.filter(m => m.utilizationPercent >= 120).length,
            },
        }

        await logToolCall(req, 'check_overallocation', { projectId, threshold }, {
            overallocatedCount: overallocated.length,
            criticalCount: result.healthySummary.critical,
        }, Date.now() - startTime)

        return res.json({
            success: true,
            data: result,
        })
    } catch (error: any) {
        await logToolCall(req, 'check_overallocation', { projectId }, { error: error.message }, Date.now() - startTime, false)
        req.log.error({ error: error.message }, 'Agent bridge: check_overallocation failed')
        return res.status(500).json({ error: error.message })
    }
}

// ========================================
// Helper Functions
// ========================================

async function getTeamMembersWithWorkload(req: any, projectId: string) {
    // Get unique assignees from project issues
    const assignees = await req.database.devtelIssues.findAll({
        where: {
            projectId,
            assigneeId: { [Op.ne]: null },
            status: { [Op.notIn]: ['done', 'cancelled'] },
            deletedAt: null,
        },
        attributes: [
            'assigneeId',
            [req.database.Sequelize.fn('COUNT', '*'), 'issueCount'],
            [req.database.Sequelize.fn('SUM', req.database.Sequelize.col('estimatedHours')), 'totalHours'],
            [req.database.Sequelize.fn('SUM', req.database.Sequelize.col('storyPoints')), 'totalPoints'],
            [req.database.Sequelize.fn('SUM',
                req.database.Sequelize.literal("CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END")
            ), 'inProgressCount'],
        ],
        group: ['assigneeId'],
        raw: true,
    })

    // Get user details
    const userIds = assignees.map((a: any) => a.assigneeId)
    const users = await req.database.user.findAll({
        where: { id: { [Op.in]: userIds } },
        attributes: ['id', 'fullName', 'email'],
    })

    const userMap = new Map(users.map((u: any) => [u.id, u]))

    return assignees.map((a: any) => {
        const user = userMap.get(a.assigneeId)
        const weeklyCapacity = 40 // Default
        const allocatedHours = parseInt(a.totalHours) || (parseInt(a.issueCount) * 4) // Default 4h per issue
        const utilizationPercent = Math.round((allocatedHours / weeklyCapacity) * 100)

        return {
            userId: a.assigneeId,
            name: user?.fullName || 'Unknown',
            email: user?.email,
            weeklyCapacity,
            allocatedHours,
            allocatedPoints: parseInt(a.totalPoints) || 0,
            assignedIssues: parseInt(a.issueCount) || 0,
            inProgressIssues: parseInt(a.inProgressCount) || 0,
            utilizationPercent,
            isOverallocated: utilizationPercent > 100,
        }
    })
}

function generateRecommendation(member: any): string {
    if (member.utilizationPercent >= 150) {
        return `Critical: ${member.name} is severely overloaded. Immediately reassign ${Math.ceil(member.assignedIssues * 0.3)} lower-priority issues.`
    } else if (member.utilizationPercent >= 120) {
        return `High: ${member.name} needs load balancing. Consider reassigning ${Math.ceil(member.assignedIssues * 0.2)} issues to available team members.`
    } else {
        return `Medium: ${member.name} is slightly overallocated. Monitor for burnout and consider adjusting deadlines.`
    }
}

async function logToolCall(req: any, toolName: string, parameters: any, response: any, durationMs: number, success = true) {
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
        })
    } catch (e) {
        req.log.warn({ error: (e as Error).message }, 'Failed to log tool call')
    }
}
