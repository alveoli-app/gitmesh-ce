/**
 * Shared Signals Permissions Service
 * Permission checking service used by both community and premium editions
 */

class SignalsPermissions {
  constructor() {
    // Initialize permissions
  }

  /**
   * Check if user can read signals
   * @param {Object} user - User object
   * @param {Object} tenant - Tenant object (optional)
   * @returns {boolean} True if user can read signals
   */
  canRead(user, tenant = null) {
    // All authenticated users can read signals
    return !!user;
  }

  /**
   * Check if user can write/create signals
   * @param {Object} user - User object
   * @param {Object} tenant - Tenant object (optional)
   * @returns {boolean} True if user can write signals
   */
  canWrite(user, tenant = null) {
    // All authenticated users can write signals
    return !!user;
  }

  /**
   * Check if user can delete signals
   * @param {Object} user - User object
   * @param {Object} signal - Signal object (optional)
   * @param {Object} tenant - Tenant object (optional)
   * @returns {boolean} True if user can delete signals
   */
  canDelete(user, signal = null, tenant = null) {
    if (!user) return false;
    
    // Users can delete their own signals or admins can delete any
    if (signal) {
      return signal.userId === user.id || user.isAdmin;
    }
    
    // General delete permission
    return !!user;
  }

  /**
   * Check if user can access premium features (sentinel)
   * This should be overridden in premium edition
   * @param {Object} user - User object
   * @param {Object} tenant - Tenant object (optional)
   * @returns {boolean} True if user can access premium features
   */
  canAccessPremium(user, tenant = null) {
    // Community edition doesn't have premium features
    return false;
  }

  /**
   * Check if user can access sentinel page
   * This should be overridden in premium edition
   * @param {Object} user - User object
   * @param {Object} tenant - Tenant object (optional)
   * @returns {boolean} True if user can access sentinel
   */
  canAccessSentinel(user, tenant = null) {
    // Community edition doesn't have sentinel access
    return false;
  }

  /**
   * Check if user can perform specific action on signal
   * @param {Object} user - User object
   * @param {string} action - Action to perform
   * @param {Object} signal - Signal object (optional)
   * @param {Object} tenant - Tenant object (optional)
   * @returns {boolean} True if user can perform action
   */
  canPerformAction(user, action, signal = null, tenant = null) {
    if (!user) return false;
    
    switch (action) {
      case 'read':
        return this.canRead(user, tenant);
      
      case 'write':
      case 'create':
        return this.canWrite(user, tenant);
      
      case 'update':
      case 'edit':
        if (signal) {
          return this.canWrite(user, tenant) && (signal.userId === user.id || user.isAdmin);
        }
        return this.canWrite(user, tenant);
      
      case 'delete':
        return this.canDelete(user, signal, tenant);
      
      case 'like':
      case 'comment':
      case 'share':
      case 'bookmark':
        return this.canRead(user, tenant);
      
      case 'premium':
        return this.canAccessPremium(user, tenant);
      
      case 'sentinel':
        return this.canAccessSentinel(user, tenant);
      
      default:
        return false;
    }
  }

  /**
   * Get available permissions for current user
   * @param {Object} user - User object
   * @param {Object} tenant - Tenant object (optional)
   * @returns {Array} Array of available permissions
   */
  getAvailablePermissions(user, tenant = null) {
    const permissions = [];
    
    if (this.canRead(user, tenant)) {
      permissions.push('read');
    }
    
    if (this.canWrite(user, tenant)) {
      permissions.push('write');
    }
    
    if (this.canDelete(user, null, tenant)) {
      permissions.push('delete');
    }
    
    if (this.canAccessPremium(user, tenant)) {
      permissions.push('premium');
    }
    
    if (this.canAccessSentinel(user, tenant)) {
      permissions.push('sentinel');
    }
    
    return permissions;
  }

  /**
   * Get permission error message
   * @param {string} permission - Permission that was denied
   * @returns {string} Error message
   */
  getPermissionErrorMessage(permission) {
    const messages = {
      read: 'You do not have permission to view signals',
      write: 'You do not have permission to create signals',
      delete: 'You do not have permission to delete this signal',
      premium: 'This feature requires a premium subscription',
      sentinel: 'Sentinel access requires a premium subscription',
      update: 'You do not have permission to edit this signal',
      edit: 'You do not have permission to edit this signal',
    };
    
    return messages[permission] || 'You do not have permission to perform this action';
  }

  /**
   * Check if permission requires upgrade
   * @param {string} permission - Permission to check
   * @returns {boolean} True if permission requires upgrade
   */
  requiresUpgrade(permission) {
    const upgradePermissions = ['premium', 'sentinel'];
    return upgradePermissions.includes(permission);
  }

  /**
   * Validate user permissions for multiple actions
   * @param {Object} user - User object
   * @param {Array} actions - Array of actions to validate
   * @param {Object} signal - Signal object (optional)
   * @param {Object} tenant - Tenant object (optional)
   * @returns {Object} Object with validation results
   */
  validatePermissions(user, actions, signal = null, tenant = null) {
    const results = {
      valid: [],
      invalid: [],
      requiresUpgrade: [],
    };
    
    actions.forEach(action => {
      if (this.canPerformAction(user, action, signal, tenant)) {
        results.valid.push(action);
      } else {
        results.invalid.push(action);
        
        if (this.requiresUpgrade(action)) {
          results.requiresUpgrade.push(action);
        }
      }
    });
    
    return results;
  }
}

export default new SignalsPermissions();