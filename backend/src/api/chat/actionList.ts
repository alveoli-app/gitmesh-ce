import Permissions from '../../security/permissions'
import PermissionChecker from '../../services/user/permissionChecker'

/**
 * List executed actions with filtering
 */
export default async (req, res) => {
    new PermissionChecker(req).validateHas(Permissions.values.memberRead)

    const where: any = {
        tenantId: req.currentTenant.id,
    }

    // Apply filters
    if (req.query.conversationId) {
        where.conversationId = req.query.conversationId
    }

    if (req.query.agentId) {
        if (Array.isArray(req.query.agentId)) {
            where.agentId = { [req.database.Sequelize.Op.in]: req.query.agentId }
        } else {
            where.agentId = req.query.agentId
        }
    }

    if (req.query.actionType) {
        if (Array.isArray(req.query.actionType)) {
            where.actionType = { [req.database.Sequelize.Op.in]: req.query.actionType }
        } else {
            where.actionType = req.query.actionType
        }
    }

    if (req.query.status) {
        where.status = req.query.status
    }

    if (req.query.entityId) {
        where.affectedEntityId = req.query.entityId
    }

    if (req.query.startDate || req.query.endDate) {
        where.createdAt = {}
        if (req.query.startDate) {
            where.createdAt[req.database.Sequelize.Op.gte] = new Date(req.query.startDate)
        }
        if (req.query.endDate) {
            where.createdAt[req.database.Sequelize.Op.lte] = new Date(req.query.endDate)
        }
    }

    const limit = parseInt(req.query.limit) || 50
    const offset = parseInt(req.query.offset) || 0

    const actions = await req.database.chatExecutedActions.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        include: [
            {
                model: req.database.user,
                as: 'executor',
                attributes: ['id', 'fullName', 'email'],
            },
        ],
    })

    await req.responseHandler.success(req, res, {
        rows: actions.rows.map((a: any) => a.get({ plain: true })),
        count: actions.count,
    })
}
