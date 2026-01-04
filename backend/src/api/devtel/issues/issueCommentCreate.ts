import Permissions from '../../../security/permissions'
import PermissionChecker from '../../../services/user/permissionChecker'
import { Error400 } from '@gitmesh/common'

/**
 * POST /tenant/{tenantId}/devtel/projects/:projectId/issues/:issueId/comments
 * @summary Create a comment on an issue
 * @tag DevTel Issues
 * @security Bearer
 */
export default async (req, res) => {
    new PermissionChecker(req).validateHas(Permissions.values.memberCreate)

    const { issueId, projectId } = req.params
    const { content } = req.body

    if (!content || typeof content !== 'string') {
        throw new Error400(req.language, 'devtel.comment.contentRequired')
    }

    // Create comment
    const comment = await req.database.devtelIssueComments.create({
        issueId,
        authorId: req.currentUser.id,
        content,
    })

    // Fetch with author info
    const result = await req.database.devtelIssueComments.findOne({
        where: { id: comment.id },
        include: [
            {
                model: req.database.user,
                as: 'author',
                attributes: ['id', 'fullName', 'email', 'firstName', 'lastName'],
            },
        ],
    })

    // Broadcast via Socket.IO
    if (req.io?.devtel) {
        req.io.devtel.emitCommentAdded(req.params.projectId, req.params.issueId, comment)
    }

    await req.responseHandler.success(req, res, comment)
}
