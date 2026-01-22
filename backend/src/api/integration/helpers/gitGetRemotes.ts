import Permissions from '../../../security/permissions'
import IntegrationService from '../../../services/integrationService'
import PermissionChecker from '../../../services/user/permissionChecker'

// TODO: Git integration is temporarily disabled from the UI
// Will be re-enabled in the future to support syncing with different Git platforms
// (GitLab, Bitbucket, self-hosted Git servers, etc.)
export default async (req, res) => {
  new PermissionChecker(req).validateHas(Permissions.values.tenantEdit)
  const payload = await new IntegrationService(req).gitGetRemotes()
  await req.responseHandler.success(req, res, payload)
}
