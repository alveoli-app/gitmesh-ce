/**
 * Shared Signals Permissions Mixin
 * Permission checking functionality for signals used by both editions
 */

import { mapGetters } from '@/shared/vuex/vuex.helpers';

export default {
  computed: {
    ...mapGetters('auth', ['currentUser', 'currentTenant']),
    
    /**
     * Check if user can read signals
     */
    canReadSignals() {
      // All authenticated users can read signals in community edition
      return !!this.currentUser;
    },
    
    /**
     * Check if user can write/create signals
     */
    canWriteSignals() {
      // All authenticated users can write signals in community edition
      return !!this.currentUser;
    },
    
    /**
     * Check if user can delete signals
     */
    canDeleteSignals() {
      // All authenticated users can delete their own signals in community edition
      return !!this.currentUser;
    },
    
    /**
     * Check if user can access premium signals features
     */
    canAccessPremiumSignals() {
      // This will be overridden in premium edition
      return false;
    },
    
    /**
     * Check if user can access sentinel page
     */
    canAccessSentinel() {
      // This will be overridden in premium edition
      return false;
    },
    
    /**
     * Get available signal permissions for current user
     */
    signalsPermissions() {
      const permissions = [];
      
      if (this.canReadSignals) {
        permissions.push('read');
      }
      
      if (this.canWriteSignals) {
        permissions.push('write');
      }
      
      if (this.canDeleteSignals) {
        permissions.push('delete');
      }
      
      if (this.canAccessPremiumSignals) {
        permissions.push('premium');
      }
      
      if (this.canAccessSentinel) {
        permissions.push('sentinel');
      }
      
      return permissions;
    },
  },
  
  methods: {
    /**
     * Check if user has specific signal permission
     */
    hasSignalPermission(permission) {
      return this.signalsPermissions.includes(permission);
    },
    
    /**
     * Check if user can perform action on specific signal
     */
    canPerformSignalAction(signal, action) {
      if (!signal || !this.currentUser) return false;
      
      switch (action) {
        case 'read':
          return this.canReadSignals;
        
        case 'edit':
        case 'update':
          // Users can edit their own signals or if they have write permissions
          return this.canWriteSignals && (
            signal.userId === this.currentUser.id || 
            this.currentUser.isAdmin
          );
        
        case 'delete':
          // Users can delete their own signals or if they have delete permissions
          return this.canDeleteSignals && (
            signal.userId === this.currentUser.id || 
            this.currentUser.isAdmin
          );
        
        case 'like':
        case 'comment':
        case 'share':
          // Basic interactions require read permission
          return this.canReadSignals;
        
        default:
          return false;
      }
    },
    
    /**
     * Get permission error message
     */
    getPermissionErrorMessage(permission) {
      const messages = {
        read: 'You do not have permission to view signals',
        write: 'You do not have permission to create signals',
        delete: 'You do not have permission to delete signals',
        premium: 'This feature requires a premium subscription',
        sentinel: 'Sentinel access requires a premium subscription',
      };
      
      return messages[permission] || 'You do not have permission to perform this action';
    },
    
    /**
     * Handle permission denied scenario
     */
    handlePermissionDenied(permission, redirectToUpgrade = false) {
      const message = this.getPermissionErrorMessage(permission);
      
      // Show error message
      this.showError(message);
      
      // Redirect to upgrade page for premium features
      if (redirectToUpgrade && (permission === 'premium' || permission === 'sentinel')) {
        this.redirectToUpgrade();
      }
    },
    
    /**
     * Redirect to upgrade page
     */
    redirectToUpgrade() {
      // This should be implemented based on the app's routing structure
      this.$router.push('/upgrade');
    },
    
    /**
     * Show error message (should be implemented by parent component)
     */
    showError(message) {
      console.error(message);
      // This should integrate with the app's notification system
      // Example: this.$toast.error(message);
    },
  },
};