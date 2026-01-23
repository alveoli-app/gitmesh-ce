import PermissionChecker from '../../services/user/permissionChecker'
import Permissions from '../../security/permissions'
import SignalsService from '../../services/signalsService'
import { SignalsValidation } from './validation/signalsValidation'

export default async (req, res) => {
  new PermissionChecker(req).validateHas(Permissions.values.activityRead)

  // Validate parameters
  const validatedParams = SignalsValidation.validateFindByIdParams(req.params)

  const payload = await new SignalsService(req).findById(validatedParams.id)

  await req.responseHandler.success(req, res, payload)
}