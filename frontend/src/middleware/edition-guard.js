import config from '@/config';
import { FeatureFlag } from '@/utils/featureFlag';

/**
 * Edition-based route guard utilities
 * Handles access control for premium features based on edition and feature flags
 */

/**
 * Route guard to redirect community users to upgrade prompt for premium features
 * @param {Object} to - Target route
 * @param {Object} from - Source route  
 * @param {Function} next - Navigation callback
 */
export const redirectToUpgrade = (to, from, next) => {
  if (config.isCommunityVersion) {
    console.log('Community Edition user attempted to access premium feature:', to.path);
    
    // Extract feature name from route meta or path
    const feature = to.meta?.feature || to.params?.feature || 'premium';
    
    // Redirect to paywall page with context
    next({
      name: 'paywall',
      params: { section: 'signals' },
      query: { 
        feature: feature,
        from: to.path,
        // Preserve any existing query parameters
        ...to.query
      }
    });
  } else {
    // Enterprise edition users can proceed
    next();
  }
};

/**
 * Route guard to check premium access for enterprise edition
 * Validates both edition and feature flag requirements
 * @param {Object} to - Target route
 * @param {Object} from - Source route
 * @param {Function} next - Navigation callback
 */
export const checkPremiumAccess = (to, from, next) => {
  if (config.isCommunityVersion) {
    // Community edition users should be redirected to upgrade
    redirectToUpgrade(to, from, next);
    return;
  }

  // Enterprise edition - check if signals feature is enabled
  if (to.meta?.requiresSignals && !FeatureFlag.isFlagEnabled(FeatureFlag.flags.signals)) {
    console.log('Enterprise Edition user lacks required feature flag for:', to.path);
    // Redirect to settings if signals feature is not enabled
    next({
      name: 'settings',
      query: { 
        activeTab: 'plans', 
        feature: 'signals',
        from: to.path
      }
    });
    return;
  }

  // Check for chat feature requirement
  if (to.meta?.requiresChat && !FeatureFlag.isFlagEnabled(FeatureFlag.flags.agenticChat)) {
    console.log('Enterprise Edition user lacks required chat feature flag for:', to.path);
    next({
      name: 'settings',
      query: { 
        activeTab: 'plans', 
        feature: 'chat',
        from: to.path
      }
    });
    return;
  }

  // All checks passed
  next();
};

/**
 * Route guard specifically for chat access
 * Combines edition check with chat feature flag validation
 * @param {Object} to - Target route
 * @param {Object} from - Source route
 * @param {Function} next - Navigation callback
 */
export const checkChatAccess = (to, from, next) => {
  // Set meta flag for chat requirement
  to.meta = { ...to.meta, requiresChat: true, feature: 'chat' };
  
  // Use the general premium access check
  checkPremiumAccess(to, from, next);
};

/**
 * Route guard specifically for sentinel access
 * Combines edition check with signals-sentinel feature flag validation
 * @param {Object} to - Target route
 * @param {Object} from - Source route
 * @param {Function} next - Navigation callback
 */
export const checkSentinelAccess = (to, from, next) => {
  if (config.isCommunityVersion) {
    // Community edition users should be redirected to upgrade
    redirectToUpgrade(to, from, next);
    return;
  }

  // Enterprise edition - check if signals-sentinel feature is enabled
  if (!FeatureFlag.isFlagEnabled(FeatureFlag.flags.signalsSentinel)) {
    console.log('Enterprise Edition user lacks required signals-sentinel feature flag for:', to.path);
    next({
      name: 'settings',
      query: { 
        activeTab: 'plans', 
        feature: 'sentinel',
        from: to.path
      }
    });
    return;
  }

  // All checks passed
  next();
};

/**
 * Utility function to check if a feature is available in current edition
 * @param {string} feature - Feature name (e.g., 'signals', 'chat')
 * @returns {boolean} - Whether feature is available
 */
export const isFeatureAvailable = (feature) => {
  if (config.isCommunityVersion) {
    // Community edition has basic signals features, but no sentinel
    const communityFeatures = ['dashboard', 'contacts', 'organizations', 'activities', 'automations', 'integrations', 'devspace', 'signals'];
    return communityFeatures.includes(feature) && feature !== 'sentinel';
  }
  
  // Enterprise edition has all features, but check feature flags and plans
  switch (feature) {
    case 'signals':
      return FeatureFlag.isFlagEnabled(FeatureFlag.flags.signals);
    case 'sentinel':
      // Sentinel requires the new signals-sentinel flag
      return FeatureFlag.isFlagEnabled(FeatureFlag.flags.signalsSentinel);
    case 'chat':
      return FeatureFlag.isFlagEnabled(FeatureFlag.flags.agenticChat);
    default:
      return true;
  }
};

/**
 * Utility function to get upgrade URL for a specific feature
 * @param {string} feature - Feature name
 * @param {string} fromPath - Current path for context
 * @returns {Object} - Route object for upgrade page
 */
export const getUpgradeRoute = (feature, fromPath = null) => {
  if (config.isCommunityVersion) {
    return {
      name: 'paywall',
      params: { section: feature === 'chat' ? 'chat' : 'signals' },
      query: { 
        feature: feature,
        ...(fromPath && { from: fromPath })
      }
    };
  }
  
  return {
    name: 'settings',
    query: { 
      activeTab: 'plans', 
      feature: feature,
      ...(fromPath && { from: fromPath })
    }
  };
};