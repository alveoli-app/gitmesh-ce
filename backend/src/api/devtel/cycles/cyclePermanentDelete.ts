import Permissions from '../../../security/permissions'
import PermissionChecker from '../../../services/user/permissionChecker'
import DevtelCycleService from '../../../services/devtel/devtelCycleService'

/**
 * DELETE /tenant/{tenantId}/devtel/projects/:projectId/cycles/:cycleId/permanent
 * @summary Permanently delete an archived cycle (bypasses 30-day retention)
 * @tag DevTel Cycles
 * @security Bearer
 */
export default async (req, res) => {
    new PermissionChecker(req).validateHas(Permissions.values.memberEdit)

    const service = new DevtelCycleService(req)
    await service.permanentDelete(req.params.projectId, req.params.cycleId)

    await req.responseHandler.success(req, res, { success: true })
}
