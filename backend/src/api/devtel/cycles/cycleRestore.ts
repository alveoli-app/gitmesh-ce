import Permissions from '../../../security/permissions'
import PermissionChecker from '../../../services/user/permissionChecker'
import DevtelCycleService from '../../../services/devtel/devtelCycleService'

/**
 * POST /tenant/{tenantId}/devtel/projects/:projectId/cycles/:cycleId/restore
 * @summary Restore an archived cycle
 * @tag DevTel Cycles
 * @security Bearer
 */
export default async (req, res) => {
    new PermissionChecker(req).validateHas(Permissions.values.memberEdit)

    const service = new DevtelCycleService(req)
    const cycle = await service.restore(req.params.projectId, req.params.cycleId)

    await req.responseHandler.success(req, res, cycle)
}
