import Permissions from '../../../security/permissions'
import PermissionChecker from '../../../services/user/permissionChecker'
import DevtelWorkspaceService from '../../../services/devtel/devtelWorkspaceService'

/**
 * GET /tenant/{tenantId}/devtel/team
 * @summary List team members with DevTel stats
 * @tag DevTel Team
 * @security Bearer
 */
export default async (req, res) => {
    new PermissionChecker(req).validateHas(Permissions.values.memberRead)

    const workspaceService = new DevtelWorkspaceService(req)
    const workspace = await workspaceService.getForCurrentTenant()

    // Get all users in tenant
    const users = await req.database.user.findAll({
        include: [
            {
                model: req.database.tenantUser,
                as: 'tenants',
                where: { tenantId: req.currentTenant.id },
                attributes: [],
            },
        ],
        attributes: ['id', 'fullName', 'email', 'firstName', 'lastName', 'createdAt'],
    })

    // Get skills for each user
    const userIds = users.map(u => u.id)
    const skills = await req.database.devtelUserSkills.findAll({
        where: {
            userId: userIds,
            workspaceId: workspace.id,
        },
    })

    // Get issue stats per user
    const issueStats = await req.database.devtelIssues.findAll({
        where: {
            assigneeId: userIds,
            deletedAt: null,
        },
        attributes: [
            'assigneeId',
            'status',
            [req.database.sequelize.fn('COUNT', '*'), 'count'],
        ],
        group: ['assigneeId', 'status'],
        raw: true,
    })

    // Build team response
    const team = users.map(user => {
        const userSkills = skills.filter(s => s.userId === user.id)
        const userStats = issueStats.filter((s: any) => s.assigneeId === user.id)

        const stats = {
            total: 0,
            completed: 0,
            inProgress: 0,
        }

        userStats.forEach((s: any) => {
            const count = parseInt(s.count, 10)
            stats.total += count
            if (s.status === 'done') stats.completed = count
            if (s.status === 'in_progress' || s.status === 'review') stats.inProgress += count
        })

        return {
            ...user.get({ plain: true }),
            skills: userSkills.map(s => ({
                id: s.id,
                skill: s.skill,
                level: s.level,
            })),
            issueStats: stats,
        }
    })

    await req.responseHandler.success(req, res, { team })
}
