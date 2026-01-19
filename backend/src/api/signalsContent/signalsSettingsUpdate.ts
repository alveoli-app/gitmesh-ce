import Permissions from '../../security/permissions'
import SignalsSettingsService from '../../services/signalsSettingsService'
import PermissionChecker from '../../services/user/permissionChecker'

export default async (req, res) => {
  new PermissionChecker(req).validateHas(Permissions.values.signalsActionCreate)

  // Check if this is for sentinel feature via query parameter
  const feature = req.query.feature === 'sentinel' ? 'sentinel' : 'signals'
  
  console.log('🔧 SignalsSettingsUpdate: Updating settings for feature:', feature)
  console.log('🔧 Query params:', req.query)

  const payload = await new SignalsSettingsService(req).update(req.body, feature)

  await req.responseHandler.success(req, res, payload)
}
