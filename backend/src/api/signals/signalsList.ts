import PermissionChecker from '../../services/user/permissionChecker'
import Permissions from '../../security/permissions'
import SignalsService from '../../services/signalsService'
import track from '../../segment/track'
import { SignalsValidation } from './validation/signalsValidation'

export default async (req, res) => {
  new PermissionChecker(req).validateHas(Permissions.values.activityRead)

  // Validate and sanitize query parameters
  const sanitizedQuery = SignalsValidation.sanitizeQuery(req.query)
  const validatedQuery = SignalsValidation.validateListQuery(sanitizedQuery)

  const payload = await new SignalsService(req).findAndCountAll(validatedQuery)

  if (validatedQuery.filter && Object.keys(validatedQuery.filter).length > 0) {
    track('Signals Filtered', { filter: validatedQuery.filter }, { ...req })
  }

  await req.responseHandler.success(req, res, payload)
}