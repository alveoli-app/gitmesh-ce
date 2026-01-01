import Permissions from '../../../security/permissions'
import PermissionChecker from '../../../services/user/permissionChecker'
import DevtelWorkspaceService from '../../../services/devtel/devtelWorkspaceService'

/**
 * GET /tenant/{tenantId}/devtel/settings/integrations
 * @summary List external integrations
 * @tag DevTel Settings
 * @security Bearer
 */
export default async (req, res) => {
    new PermissionChecker(req).validateHas(Permissions.values.settingsRead)

    const workspaceService = new DevtelWorkspaceService(req)
    const workspace = await workspaceService.getForCurrentTenant()

    const integrations = await req.database.devtelIntegrations.findAll({
        where: { workspaceId: workspace.id },
        attributes: ['id', 'provider', 'status', 'settings', 'lastSyncedAt', 'createdAt'],
        order: [['createdAt', 'DESC']],
    })

    await req.responseHandler.success(req, res, integrations)
}
