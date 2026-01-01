import Permissions from '../../../security/permissions'
import PermissionChecker from '../../../services/user/permissionChecker'
import { Error400 } from '@gitmesh/common'

/**
 * PUT /tenant/{tenantId}/devtel/team/:userId  
 * @summary Update team member profile
 * @tag DevTel Team
 * @security Bearer
 */
export default async (req, res) => {
    new PermissionChecker(req).validateHas(Permissions.values.memberEdit)

    const { userId } = req.params

    const user = await req.database.user.findOne({
        where: { id: userId },
        include: [
            {
                model: req.database.tenantUser,
                as: 'tenants',
                where: { tenantId: req.currentTenant.id },
                attributes: [],
            },
        ],
    })

    if (!user) {
        throw new Error400(req.language, 'devtel.user.notFound')
    }

    // For DevTel, we only allow updating limited fields
    // Most user updates go through the main user routes
    // This is a placeholder for DevTel-specific fields

    await req.responseHandler.success(req, res, user)
}
