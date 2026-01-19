import Permissions from '../../../security/permissions'
import PermissionChecker from '../../../services/user/permissionChecker'

/**
 * POST /tenant/{tenantId}/devtel/projects/:projectId/sync/conflicts/:conflictId/resolve
 */
export default async (req, res) => {
    new PermissionChecker(req).validateHas(Permissions.values.memberRead)
    
    const { conflictId } = req.params;
    const { resolution } = req.body; 

    console.log(`[Sync] Resolving conflict ${conflictId} with strategy: ${resolution}`);

    await req.responseHandler.success(req, res, {
        message: 'Conflict resolved',
        resolvedId: conflictId
    })
}
