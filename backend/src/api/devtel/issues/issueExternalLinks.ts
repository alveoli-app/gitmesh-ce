import Permissions from '../../../security/permissions'
import PermissionChecker from '../../../services/user/permissionChecker'
import { Error400 } from '@gitmesh/common'

/**
 * GET /tenant/{tenantId}/devtel/issues/:issueId/external-links
 * @summary Get external links (PRs, etc.) for an issue
 * @tag DevTel Issues
 * @security Bearer
 */
export default async (req, res) => {
    new PermissionChecker(req).validateHas(Permissions.values.memberRead)

    const { issueId } = req.params

    // Get issue to verify it exists and belongs to tenant's workspace
    const issue = await req.database.devtelIssues.findByPk(issueId, {
        include: [{
            model: req.database.devtelProjects,
            as: 'project',
            include: [{
                model: req.database.devtelWorkspaces,
                as: 'workspace',
                where: { tenantId: req.currentTenant.id },
            }],
        }],
    })

    if (!issue) {
        throw new Error400(req.language, 'devtel.issue.notFound')
    }

    // Fetch external links
    const links = await req.database.devtelExternalLinks.findAll({
        where: {
            linkableType: 'issue',
            linkableId: issueId,
        },
        order: [['createdAt', 'DESC']],
    })

    const formattedLinks = links.map(link => ({
        id: link.id,
        externalType: link.externalType,
        externalId: link.externalId,
        url: link.url,
        metadata: link.metadata,
        status: link.metadata?.status,
        merged: link.metadata?.merged,
        title: link.metadata?.title,
        author: link.metadata?.author,
        repository: link.metadata?.repository,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
    }))

    await req.responseHandler.success(req, res, { links: formattedLinks })
}
