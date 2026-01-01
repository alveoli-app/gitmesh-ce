import Permissions from '../../../security/permissions'
import PermissionChecker from '../../../services/user/permissionChecker'
import { Error400 } from '@gitmesh/common'

/**
 * DELETE /tenant/{tenantId}/devtel/settings/integrations/:integrationId
 * @summary Delete an integration
 * @tag DevTel Settings
 * @security Bearer
 */
export default async (req, res) => {
    new PermissionChecker(req).validateHas(Permissions.values.settingsEdit)

    const { integrationId } = req.params

    const integration = await req.database.devtelIntegrations.findByPk(integrationId)

    if (!integration) {
        throw new Error400(req.language, 'devtel.integration.notFound')
    }

    await integration.destroy()

    await req.responseHandler.success(req, res, { success: true })
}
