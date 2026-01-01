import Permissions from '../../../security/permissions'
import PermissionChecker from '../../../services/user/permissionChecker'
import DevtelWorkspaceService from '../../../services/devtel/devtelWorkspaceService'

/**
 * GET /tenant/{tenantId}/devtel/team/analytics
 * @summary Get team analytics
 * @tag DevTel Team
 * @security Bearer
 */
export default async (req, res) => {
    new PermissionChecker(req).validateHas(Permissions.values.memberRead)

    const workspaceService = new DevtelWorkspaceService(req)
    const workspace = await workspaceService.getForCurrentTenant()

    // Get completed issues by user in last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const completedByUser = await req.database.devtelIssues.findAll({
        where: {
            status: 'done',
            updatedAt: { [req.database.Sequelize.Op.gte]: thirtyDaysAgo },
            deletedAt: null,
        },
        attributes: [
            'assigneeId',
            [req.database.sequelize.fn('COUNT', '*'), 'count'],
            [req.database.sequelize.fn('SUM', req.database.sequelize.col('storyPoints')), 'points'],
        ],
        group: ['assigneeId'],
        raw: true,
    })

    // Get users
    const users = await req.database.user.findAll({
        include: [
            {
                model: req.database.tenantUser,
                as: 'tenants',
                where: { tenantId: req.currentTenant.id },
                attributes: [],
            },
        ],
        attributes: ['id', 'fullName', 'email'],
    })

    const userMap = users.reduce((acc, u) => {
        acc[u.id] = u.get({ plain: true })
        return acc
    }, {})

    const analytics = {
        period: '30 days',
        completionsByUser: completedByUser.map((item: any) => ({
            user: userMap[item.assigneeId] || { id: item.assigneeId },
            completedCount: parseInt(item.count, 10),
            storyPoints: parseInt(item.points, 10) || 0,
        })),
        totalCompleted: completedByUser.reduce((sum: number, item: any) => sum + parseInt(item.count, 10), 0),
        totalPoints: completedByUser.reduce((sum: number, item: any) => sum + (parseInt(item.points, 10) || 0), 0),
    }

    await req.responseHandler.success(req, res, analytics)
}
