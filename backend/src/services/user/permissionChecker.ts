import assert from 'assert'
import { Error400, Error403 } from '@gitmesh/common'
import Plans from '../../security/plans'
import Permissions from '../../security/permissions'
import EmailSender from '../emailSender'

const plans = Plans.values

/**
 * Checks the Permission of the User on a Tenant.
 */
export default class PermissionChecker {
  currentTenant

  language

  currentUser

  constructor({ currentTenant, language, currentUser }) {
    this.currentTenant = currentTenant
    this.language = language
    this.currentUser = currentUser
  }

  /**
   * Validates if the user has a specific permission
   * and throws a Error403 if it doesn't.
   */
  validateHas(permission) {
    if (!this.has(permission)) {
      let reason = 'Unknown'
      try {
        if (!this.currentUser) reason = 'No Current User'
        else if (!this.isEmailVerified) reason = 'Email Not Verified'
        else if (!this.hasPlanPermission(permission)) {
          reason = `Plan Denied. CurrentPlan='${
            this.currentTenantPlan
          }' (Type: ${typeof this.currentTenantPlan}). Allowed: ${JSON.stringify(
            permission.allowedPlans,
          )}`
        } else if (!this.hasRolePermission(permission)) {
          // Debug Tenant Finding again
          const tenant = this.currentUser.tenants
            .filter((tenantUser) => tenantUser.status === 'active')
            .find((tenantUser) => tenantUser.tenant.id === this.currentTenant.id)

          const available = this.currentUser.tenants
            .map((t) => `${t.tenant.id} (status:${t.status})`)
            .join(', ')

          reason = `Role Denied. Roles=${JSON.stringify(
            this.currentUserRolesIds,
          )}. Allowed=${JSON.stringify(
            permission.allowedRoles,
          )}. TenantFound=${!!tenant}. CurrentTenantID=${
            this.currentTenant.id
          }. AvailableTenants=[${available}]`
        }
      } catch (e) {
        reason = `Error calculating reason: ${e.message}`
      }

      console.error(`[PermissionChecker] BLOCKING REQUEST: ${reason}`)
      throw new Error(`DEBUG_PERMISSION_DENIED: ${reason}`)
    }
  }

  /**
   * Validates if the user has any permission among specified
   * and throws Error403 if it doesn't
   */
  validateHasAny(permissions) {
    const hasOne = permissions.some((p) => this.has(p))

    if (!hasOne) {
      throw new Error403(this.language)
    }
  }

  /**
   * Checks if the user has permission to change certain protected
   * fields in an integration.
   * @param data Data sent to the integration write service
   */
  validateIntegrationsProtectedFields(data) {
    if (data.limitCount !== undefined) {
      this.validateHas(Permissions.values.integrationControlLimit)
    }
  }

  /**
   * Checks if the user has permission to change certain protected
   * fields in a microservice.
   * @param data Data sent to the microservice write service
   */
  validateMicroservicesProtectedFields(data) {
    if (data.variant !== undefined) {
      if (data.variant === 'default') {
        this.validateHas(Permissions.values.microserviceVariantFree)
      } else if (data.variant === 'premium') {
        this.validateHas(Permissions.values.microserviceVariantPremium)
      } else {
        throw new Error400(`Invalid variant: ${data.variant}`)
      }
    }
  }

  /**
   * Checks if the user has a specific permission.
   */
  has(permission) {
    if (!permission) {
      console.error('[PermissionChecker] Permission object is null or undefined')
      return false
    }

    // console.error(`[PermissionChecker] Checking permission: ${permission.id}`)

    if (!this.currentUser) {
      console.error(`[PermissionChecker] No current user`)
      return false
    }

    if (!this.isEmailVerified) {
      console.error(`[PermissionChecker] Email not verified`)
      return false
    }

    if (!this.hasPlanPermission(permission)) {
       console.error(`[PermissionChecker] Permission ${permission.id} denied by plan. CurrentPlan=${this.currentTenantPlan}. Allowed: ${JSON.stringify(permission.allowedPlans)}`)
      return false
    }

    const rolePerm = this.hasRolePermission(permission)
    if (!rolePerm) {
        console.error(`[PermissionChecker] Permission ${permission.id} denied by role. UserRoles=${JSON.stringify(this.currentUserRolesIds)}. Allowed: ${JSON.stringify(permission.allowedRoles)}`)
    }
    return rolePerm
  }

  /**
   * Validates if the user has access to a storage
   * and throws a Error403 if it doesn't.
   */
  validateHasStorage(storageId) {
    if (!this.hasStorage(storageId)) {
      throw new Error403(this.language)
    }
  }

  /**
   * Validates if the user has access to a storage.
   */
  hasStorage(storageId: string) {
    assert(storageId, 'storageId is required')
    return this.allowedStorageIds().includes(storageId)
  }

  /**
   * Checks if the current user roles allows the permission.
   */
  hasRolePermission(permission) {
    const hasRole = this.currentUserRolesIds.some((role) =>
      permission.allowedRoles.some((allowedRole) => allowedRole === role),
    )
    if (!hasRole) {
        console.log(`[PermissionChecker] Role validation failed for ${permission.id}. User roles: ${JSON.stringify(this.currentUserRolesIds)}, Allowed roles: ${JSON.stringify(permission.allowedRoles)}`)
    }
    return hasRole
  }

  /**
   * Checks if the current company plan allows the permission.
   */
  hasPlanPermission(permission) {
    assert(permission, 'permission is required')

    const hasPlan = permission.allowedPlans.includes(this.currentTenantPlan)
    if (!hasPlan) {
        console.log(`[PermissionChecker] Plan validation failed for ${permission.id}. Current plan: ${this.currentTenantPlan}, Allowed plans: ${JSON.stringify(permission.allowedPlans)}`)
    }
    return hasPlan
  }

  get isEmailVerified() {
    // Only checks if the email is verified
    // if the email system is on
    if (!EmailSender.isConfigured) {
      return true
    }

    return this.currentUser.emailVerified
  }

  /**
   * Returns the Current User Roles.
   */
  get currentUserRolesIds() {
    if (!this.currentUser || !this.currentUser.tenants) {
      console.error(`[PermissionChecker] No currentUser or tenants list (User ID: ${this.currentUser?.id})`)
      return []
    }

    const tenant = this.currentUser.tenants
      .filter((tenantUser) => tenantUser.status === 'active')
      .find((tenantUser) => tenantUser.tenant.id === this.currentTenant.id)

    if (!tenant) {
      console.error(`[PermissionChecker] Tenant not found in user list or not active. TargetID: ${this.currentTenant ? this.currentTenant.id : 'null'}`)
      const available = this.currentUser.tenants.map(t => `${t.tenant.id} (${t.status})`).join(', ')
      console.error(`[PermissionChecker] Available tenants: ${available}`)
      return []
    }

    return tenant.roles
  }

  /**
   * Return the current tenant plan,
   * check also if it's not expired.
   */
  get currentTenantPlan() {
    if (!this.currentTenant || !this.currentTenant.plan) {
      return plans.pro
    }

    // Map legacy plans to new structure
    if (['Essential', 'Growth'].includes(this.currentTenant.plan)) {
      return plans.pro
    }

    if (['Scale', 'Signals'].includes(this.currentTenant.plan)) {
      return plans.teamsPlus
    }

    return this.currentTenant.plan
  }

  /**
   * Returns the allowed storage ids for the user.
   */
  allowedStorageIds() {
    let allowedStorageIds: Array<string> = []

    Permissions.asArray.forEach((permission) => {
      if (this.has(permission)) {
        allowedStorageIds = allowedStorageIds.concat(
          (permission.allowedStorage || []).map((storage) => storage.id),
        )
      }
    })

    return [...new Set(allowedStorageIds)]
  }
}
