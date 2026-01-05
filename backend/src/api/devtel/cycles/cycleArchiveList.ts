import Permissions from '../../../security/permissions'
import PermissionChecker from '../../../services/user/permissionChecker'
import DevtelCycleService from '../../../services/devtel/devtelCycleService'

/**
 * GET /tenant/{tenantId}/devtel/projects/:projectId/cycles/archived
 * @summary List archived cycles (within 30-day retention)
 * @tag DevTel Cycles
 * @security Bearer
 */
export default async (req, res) => {
    new PermissionChecker(req).validateHas(Permissions.values.memberRead)

    const service = new DevtelCycleService(req)
    const result = await service.listArchived(req.params.projectId, req.query)

    await req.responseHandler.success(req, res, result)
}
