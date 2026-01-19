/**
 * Shared Signals Base Mixin
 * Common functionality for signals components used by both editions
 */

import { mapGetters, mapActions } from '@/shared/vuex/vuex.helpers';

export default {
  computed: {
    ...mapGetters('auth', ['currentUser', 'currentTenant']),
    ...mapGetters('signals', ['loading', 'signals', 'filter', 'pagination']),
    
    /**
     * Check if user has signals permissions
     */
    hasSignalsAccess() {
      // All authenticated users have access to basic signals
      return !!this.currentUser;
    },
    
    /**
     * Check if premium features are available
     * This will be overridden in premium edition
     */
    hasPremiumAccess() {
      // Default to false - premium edition will override this
      return false;
    },
    
    /**
     * Get formatted signals list
     */
    formattedSignals() {
      if (!this.signals || !Array.isArray(this.signals)) return [];
      
      // Import formatters dynamically to avoid circular dependencies
      const { formatSignalDate, formatSignalTitle, formatSignalContent } = require('@/shared/signals/utils/SignalsFormatters').default;
      const { getPlatformInfo, isRecentSignal } = require('@/shared/signals/utils/SignalsHelpers').default;
      
      return this.signals.map(signal => ({
        ...signal,
        formattedDate: formatSignalDate(signal.createdAt),
        formattedTitle: formatSignalTitle(signal.title),
        formattedContent: formatSignalContent(signal.content),
        platformInfo: getPlatformInfo(signal.platform),
        isRecent: isRecentSignal(signal),
      }));
    },
  },
  
  methods: {
    ...mapActions('signals', [
      'doFind',
      'doCreate',
      'doUpdate',
      'doDelete',
      'doUpdateFilter',
      'doReset',
    ]),
    
    /**
     * Load signals with current filter
     */
    async loadSignals() {
      try {
        await this.doFind();
      } catch (error) {
        console.error('Error loading signals:', error);
        this.showError('Failed to load signals');
      }
    },
    
    /**
     * Refresh signals data
     */
    async refreshSignals() {
      try {
        await this.doReset();
        await this.doFind();
      } catch (error) {
        console.error('Error refreshing signals:', error);
        this.showError('Failed to refresh signals');
      }
    },
    
    /**
     * Update signals filter
     */
    async updateFilter(newFilter) {
      try {
        await this.doUpdateFilter(newFilter);
        await this.doFind();
      } catch (error) {
        console.error('Error updating filter:', error);
        this.showError('Failed to update filter');
      }
    },
    
    /**
     * Handle signal action (like, comment, etc.)
     */
    async handleSignalAction(signalId, action) {
      try {
        // This would be implemented based on the specific action
        console.log('Signal action:', signalId, action);
        // await this.doSignalAction({ signalId, action });
      } catch (error) {
        console.error('Error handling signal action:', error);
        this.showError('Failed to perform action');
      }
    },
    
    /**
     * Show error message
     */
    showError(message) {
      // This should integrate with the app's notification system
      console.error(message);
      // Example: this.$toast.error(message);
    },
    
    /**
     * Show success message
     */
    showSuccess(message) {
      // This should integrate with the app's notification system
      console.log(message);
      // Example: this.$toast.success(message);
    },
    
    /**
     * Navigate to signal detail
     */
    navigateToSignal(signal) {
      if (signal.url) {
        const { getSignalUrl } = require('@/shared/signals/utils/SignalsHelpers').default;
        window.open(getSignalUrl(signal.url), '_blank');
      }
    },
    
    /**
     * Copy signal URL to clipboard
     */
    async copySignalUrl(signal) {
      if (!signal.url) return;
      
      try {
        await navigator.clipboard.writeText(signal.url);
        this.showSuccess('URL copied to clipboard');
      } catch (error) {
        console.error('Error copying URL:', error);
        this.showError('Failed to copy URL');
      }
    },
    
    /**
     * Share signal
     */
    shareSignal(signal) {
      if (!signal.url) return;
      
      if (navigator.share) {
        navigator.share({
          title: signal.title,
          text: signal.content,
          url: signal.url,
        });
      } else {
        // Fallback to copying URL
        this.copySignalUrl(signal);
      }
    },
    
    /**
     * Format platform name
     */
    formatPlatform(platform) {
      const { formatPlatformName } = require('@/shared/signals/utils/SignalsFormatters').default;
      return formatPlatformName(platform);
    },
    
    /**
     * Format date
     */
    formatDate(date, context = 'list') {
      const { formatSignalDate } = require('@/shared/signals/utils/SignalsFormatters').default;
      return formatSignalDate(date, context);
    },
    
    /**
     * Format number
     */
    formatNumber(number) {
      const { formatNumber } = require('@/shared/signals/utils/SignalsFormatters').default;
      return formatNumber(number);
    },
    
    /**
     * Get platform icon
     */
    getPlatformIcon(platform) {
      const { getPlatformIcon } = require('@/shared/signals/utils/SignalsHelpers').default;
      return getPlatformIcon(platform);
    },
    
    /**
     * Check if signal is valid
     */
    isValidSignal(signal) {
      const { isValidSignal } = require('@/shared/signals/utils/SignalsHelpers').default;
      return isValidSignal(signal);
    },
  },
  
  /**
   * Component lifecycle hooks
   */
  created() {
    // Initialize component if needed
    if (this.autoLoad !== false) {
      this.loadSignals();
    }
  },
  
  /**
   * Component destroyed cleanup
   */
  beforeUnmount() {
    // Cleanup if needed
  },
};