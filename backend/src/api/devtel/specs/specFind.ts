import Permissions from '../../../security/permissions'
import PermissionChecker from '../../../services/user/permissionChecker'
import { Error400 } from '@gitmesh/common'

/**
 * GET /tenant/{tenantId}/devtel/projects/:projectId/specs/:specId
 * @summary Get spec document by ID
 * @tag DevTel Specs
 * @security Bearer
 */
export default async (req, res) => {
    new PermissionChecker(req).validateHas(Permissions.values.memberRead)

    const { specId, projectId } = req.params

    const spec = await req.database.devtelSpecDocuments.findOne({
        where: {
            id: specId,
            projectId,
            deletedAt: null,
        },
        include: [
            {
                model: req.database.user,
                as: 'author',
                attributes: ['id', 'fullName', 'email', 'firstName', 'lastName'],
            },
        ],
    })

    if (!spec) {
        throw new Error400(req.language, 'devtel.spec.notFound')
    }

    await req.responseHandler.success(req, res, spec)
}
