import Permissions from '../../../security/permissions'
import PermissionChecker from '../../../services/user/permissionChecker'
import { Op } from 'sequelize'

/**
 * GET /tenant/{tenantId}/devtel/capacity/timeline
 * @summary Get weekly timeline view of capacity
 * @tag DevTel Capacity
 * @security Bearer
 */
export default async (req, res) => {
    new PermissionChecker(req).validateHas(Permissions.values.memberRead)

    const { startDate, endDate, userId } = req.query

    // Default to current week if no dates provided
    const start = startDate ? new Date(startDate as string) : new Date()
    const end = endDate ? new Date(endDate as string) : new Date()
    if (!startDate) {
        start.setDate(start.getDate() - start.getDay()) // Start of week
    }
    if (!endDate) {
        end.setDate(start.getDate() + 6) // End of week
    }

    const where: any = {
        scheduledDate: {
            [Op.between]: [start, end],
        },
    }

    if (userId) {
        where.userId = userId
    }

    const assignments = await req.database.devtelIssueAssignments.findAll({
        where,
        include: [
            {
                model: req.database.user,
                as: 'user',
                required: false,
                attributes: ['id', 'fullName', 'email', 'firstName', 'lastName'],
            },
            {
                model: req.database.devtelIssues,
                as: 'issue',
                required: false,
                where: { deletedAt: null },
                attributes: ['id', 'title', 'status', 'priority', 'estimatedHours'],
            },
        ],
        order: [['scheduledDate', 'ASC']],
    })

    // Group by date and user
    const timeline = {}
    for (const assignment of assignments) {
        const dateKey = assignment.scheduledDate?.toISOString().split('T')[0]
        if (!dateKey) continue

        if (!timeline[dateKey]) {
            timeline[dateKey] = {}
        }

        const userId = assignment.userId
        if (!timeline[dateKey][userId]) {
            timeline[dateKey][userId] = {
                user: assignment.user?.get({ plain: true }),
                assignments: [],
                totalHours: 0,
            }
        }

        timeline[dateKey][userId].assignments.push({
            issueId: assignment.issue?.id,
            issueTitle: assignment.issue?.title,
            allocatedHours: assignment.allocatedHours,
            status: assignment.issue?.status,
        })
        timeline[dateKey][userId].totalHours += parseFloat(assignment.allocatedHours) || 0
    }

    await req.responseHandler.success(req, res, {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        timeline,
    })
}
