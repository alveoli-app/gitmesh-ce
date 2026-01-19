import Permissions from '../../../security/permissions'
import PermissionChecker from '../../../services/user/permissionChecker'

/**
 * GET /tenant/{tenantId}/devtel/projects/:projectId/sync/conflicts
 */
export default async (req, res) => {
    new PermissionChecker(req).validateHas(Permissions.values.memberRead)
    
    // TODO: Fetch real conflicts from database/redis
    const conflicts = []

    await req.responseHandler.success(req, res, conflicts)
}
