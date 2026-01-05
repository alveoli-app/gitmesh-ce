import Permissions from '../../../security/permissions'
import PermissionChecker from '../../../services/user/permissionChecker'
import DevtelCycleService from '../../../services/devtel/devtelCycleService'

/**
 * POST /tenant/{tenantId}/devtel/projects/:projectId/cycles/:cycleId/move-incomplete
 * @summary Move incomplete issues from another cycle to this cycle
 * @tag DevTel Cycles
 * @security Bearer
 */
export default async (req, res) => {
    new PermissionChecker(req).validateHas(Permissions.values.memberEdit)

    const { fromCycleId } = req.body

    if (!fromCycleId) {
        return req.responseHandler.error(req, res, {
            code: 400,
            message: 'fromCycleId is required',
        })
    }

    const service = new DevtelCycleService(req)
    const result = await service.moveIncompleteIssues(
        req.params.projectId,
        fromCycleId,
        req.params.cycleId
    )

    await req.responseHandler.success(req, res, result)
}
