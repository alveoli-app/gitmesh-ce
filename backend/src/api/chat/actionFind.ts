import Permissions from '../../security/permissions'
import PermissionChecker from '../../services/user/permissionChecker'

/**
 * Get action details
 */
export default async (req, res) => {
    new PermissionChecker(req).validateHas(Permissions.values.memberRead)

    const action = await req.database.chatExecutedActions.findOne({
        where: {
            id: req.params.actionId,
            tenantId: req.currentTenant.id,
        },
        include: [
            {
                model: req.database.user,
                as: 'executor',
                attributes: ['id', 'fullName', 'email'],
            },
            {
                model: req.database.chatActionProposals,
                as: 'proposal',
            },
        ],
    })

    if (!action) {
        return res.status(404).json({ error: 'Action not found' })
    }

    await req.responseHandler.success(req, res, action.get({ plain: true }))
}
