import Permissions from '../../../security/permissions'
import PermissionChecker from '../../../services/user/permissionChecker'
import { Error400 } from '@gitmesh/common'

/**
 * GET /tenant/{tenantId}/devtel/team/:userId
 * @summary Get team member details
 * @tag DevTel Team
 * @security Bearer
 */
export default async (req, res) => {
    new PermissionChecker(req).validateHas(Permissions.values.memberRead)

    const { userId } = req.params

    const user = await req.database.user.findOne({
        where: {
            id: userId,
            tenantId: req.currentTenant.id,
        },
        attributes: ['id', 'fullName', 'email', 'firstName', 'lastName', 'createdAt'],
    })

    if (!user) {
        throw new Error400(req.language, 'devtel.user.notFound')
    }

    await req.responseHandler.success(req, res, user)
}
