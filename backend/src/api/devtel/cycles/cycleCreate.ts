import Permissions from '../../../security/permissions'
import PermissionChecker from '../../../services/user/permissionChecker'
import DevtelCycleService from '../../../services/devtel/devtelCycleService'
import { cycleCreateSchema, validateSchema } from './validation'

/**
 * POST /tenant/{tenantId}/devtel/projects/:projectId/cycles
 * @summary Create a new cycle
 * @tag DevTel Cycles
 * @security Bearer
 */
export default async (req, res) => {
    new PermissionChecker(req).validateHas(Permissions.values.memberCreate)

    // Validate input
    const inputData = req.body.data || req.body
    const validation = validateSchema(cycleCreateSchema, inputData)

    if (!validation.isValid) {
        return res.status(422).json({
            message: 'Validation failed',
            errors: validation.errors
        })
    }

    const service = new DevtelCycleService(req)
    const cycle = await service.create(req.params.projectId, validation.value)

    await req.responseHandler.success(req, res, cycle)
}
