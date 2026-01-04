import Permissions from '../../../security/permissions'
import PermissionChecker from '../../../services/user/permissionChecker'
import DevtelIssueService from '../../../services/devtel/devtelIssueService'
import { issueCreateSchema, validateSchema } from './validation'

/**
 * POST /tenant/{tenantId}/devtel/projects/:projectId/issues
 * @summary Create a new issue
 * @tag DevTel Issues
 * @security Bearer
 */
export default async (req, res) => {
    try {
        new PermissionChecker(req).validateHas(Permissions.values.taskCreate)

        // Validate input
        const inputData = req.body.data || req.body
        const validation = validateSchema(issueCreateSchema, inputData)

        if (!validation.isValid) {
            return res.status(422).json({
                message: 'Validation failed',
                errors: validation.errors
            })
        }

        const service = new DevtelIssueService(req)
        const issue = await service.create(req.params.projectId, validation.value)

        await req.responseHandler.success(req, res, issue)
    } catch (error) {
        console.error('Issue Creation Error:', error.message)
        await req.responseHandler.error(req, res, error)
    }
}
