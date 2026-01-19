/**
 * Shared Signals Helper Utilities
 * Common utility functions for signals functionality used by both editions
 */

import moment from 'moment';

/**
 * Format signal date for display
 * @param {string|Date} date - The date to format
 * @param {string} format - The format string (optional)
 * @returns {string} Formatted date string
 */
export const formatSignalDate = (date, format = 'MMM DD, YYYY') => {
  if (!date) return '';
  return moment(date).format(format);
};

/**
 * Get relative time for signal
 * @param {string|Date} date - The date to format
 * @returns {string} Relative time string (e.g., "2 hours ago")
 */
export const getSignalTimeAgo = (date) => {
  if (!date) return '';
  return moment(date).fromNow();
};

/**
 * Get platform information by platform ID
 * @param {string} platformId - The platform identifier
 * @param {Object} platformOptions - Platform options object
 * @returns {Object|null} Platform information object
 */
export const getPlatformInfo = (platformId, platformOptions = null) => {
  if (!platformId) return null;
  
  // If platformOptions not provided, try to import it
  if (!platformOptions) {
    try {
      // Dynamic import to avoid circular dependencies
      platformOptions = require('@/shared/signals/constants/signals-platforms.json');
    } catch (error) {
      console.warn('Could not load platform options:', error);
      return null;
    }
  }
  
  // Check if using new format (array of platforms)
  if (platformOptions.platforms) {
    return platformOptions.platforms.find(p => p.id === platformId) || null;
  }
  
  // Fallback to old format (object with platform keys)
  return platformOptions[platformId] || null;
};

/**
 * Get platform label by platform ID
 * @param {string} platformId - The platform identifier
 * @param {Object} platformOptions - Platform options object
 * @returns {string} Platform label or the ID if not found
 */
export const getPlatformLabel = (platformId, platformOptions = null) => {
  const platform = getPlatformInfo(platformId, platformOptions);
  return platform ? (platform.label || platform.name || platformId) : platformId;
};

/**
 * Get platform icon by platform ID
 * @param {string} platformId - The platform identifier
 * @param {Object} platformOptions - Platform options object
 * @returns {string} Platform icon URL or default icon
 */
export const getPlatformIcon = (platformId, platformOptions = null) => {
  const platform = getPlatformInfo(platformId, platformOptions);
  return platform ? (platform.img || platform.icon || '') : '';
};

/**
 * Validate signal data
 * @param {Object} signal - The signal object to validate
 * @returns {boolean} True if signal is valid
 */
export const isValidSignal = (signal) => {
  if (!signal || typeof signal !== 'object') return false;
  
  // Check required fields
  const requiredFields = ['id', 'title', 'platform'];
  return requiredFields.every(field => signal[field]);
};

/**
 * Filter signals by platform
 * @param {Array} signals - Array of signal objects
 * @param {string|Array} platforms - Platform ID(s) to filter by
 * @returns {Array} Filtered signals array
 */
export const filterSignalsByPlatform = (signals, platforms) => {
  if (!signals || !Array.isArray(signals)) return [];
  if (!platforms) return signals;
  
  const platformArray = Array.isArray(platforms) ? platforms : [platforms];
  return signals.filter(signal => 
    signal.platform && platformArray.includes(signal.platform)
  );
};

/**
 * Filter signals by date range
 * @param {Array} signals - Array of signal objects
 * @param {string|Date} startDate - Start date for filtering
 * @param {string|Date} endDate - End date for filtering
 * @returns {Array} Filtered signals array
 */
export const filterSignalsByDateRange = (signals, startDate, endDate) => {
  if (!signals || !Array.isArray(signals)) return [];
  if (!startDate && !endDate) return signals;
  
  return signals.filter(signal => {
    if (!signal.createdAt && !signal.publishedAt) return true;
    
    const signalDate = moment(signal.createdAt || signal.publishedAt);
    
    if (startDate && signalDate.isBefore(moment(startDate))) return false;
    if (endDate && signalDate.isAfter(moment(endDate))) return false;
    
    return true;
  });
};

/**
 * Sort signals by date
 * @param {Array} signals - Array of signal objects
 * @param {string} order - Sort order ('asc' or 'desc')
 * @returns {Array} Sorted signals array
 */
export const sortSignalsByDate = (signals, order = 'desc') => {
  if (!signals || !Array.isArray(signals)) return [];
  
  return [...signals].sort((a, b) => {
    const dateA = moment(a.createdAt || a.publishedAt || 0);
    const dateB = moment(b.createdAt || b.publishedAt || 0);
    
    return order === 'asc' ? dateA.diff(dateB) : dateB.diff(dateA);
  });
};

/**
 * Group signals by platform
 * @param {Array} signals - Array of signal objects
 * @returns {Object} Object with platform IDs as keys and signal arrays as values
 */
export const groupSignalsByPlatform = (signals) => {
  if (!signals || !Array.isArray(signals)) return {};
  
  return signals.reduce((groups, signal) => {
    const platform = signal.platform || 'unknown';
    if (!groups[platform]) {
      groups[platform] = [];
    }
    groups[platform].push(signal);
    return groups;
  }, {});
};

/**
 * Calculate signal engagement score
 * @param {Object} signal - The signal object
 * @returns {number} Engagement score
 */
export const calculateEngagementScore = (signal) => {
  if (!signal || typeof signal !== 'object') return 0;
  
  const likes = signal.likes || signal.upvotes || 0;
  const comments = signal.comments || signal.replies || 0;
  const shares = signal.shares || signal.retweets || 0;
  const views = signal.views || 0;
  
  // Simple engagement calculation - can be customized
  return (likes * 1) + (comments * 2) + (shares * 3) + (views * 0.1);
};

/**
 * Truncate signal content
 * @param {string} content - The content to truncate
 * @param {number} maxLength - Maximum length (default: 200)
 * @returns {string} Truncated content
 */
export const truncateSignalContent = (content, maxLength = 200) => {
  if (!content || typeof content !== 'string') return '';
  
  if (content.length <= maxLength) return content;
  
  return content.substring(0, maxLength).trim() + '...';
};

/**
 * Extract hashtags from signal content
 * @param {string} content - The content to extract hashtags from
 * @returns {Array} Array of hashtags (without #)
 */
export const extractHashtags = (content) => {
  if (!content || typeof content !== 'string') return [];
  
  const hashtagRegex = /#(\w+)/g;
  const matches = content.match(hashtagRegex);
  
  return matches ? matches.map(tag => tag.substring(1)) : [];
};

/**
 * Extract mentions from signal content
 * @param {string} content - The content to extract mentions from
 * @returns {Array} Array of mentions (without @)
 */
export const extractMentions = (content) => {
  if (!content || typeof content !== 'string') return [];
  
  const mentionRegex = /@(\w+)/g;
  const matches = content.match(mentionRegex);
  
  return matches ? matches.map(mention => mention.substring(1)) : [];
};

/**
 * Check if signal is recent (within last 24 hours)
 * @param {Object} signal - The signal object
 * @returns {boolean} True if signal is recent
 */
export const isRecentSignal = (signal) => {
  if (!signal || !signal.createdAt) return false;
  
  const signalDate = moment(signal.createdAt);
  const oneDayAgo = moment().subtract(1, 'day');
  
  return signalDate.isAfter(oneDayAgo);
};

/**
 * Get signal URL with proper protocol
 * @param {string} url - The URL to process
 * @returns {string} URL with proper protocol
 */
export const getSignalUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  
  // Add protocol if missing
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  
  return url;
};

/**
 * Default export object with all utilities
 */
export default {
  formatSignalDate,
  getSignalTimeAgo,
  getPlatformInfo,
  getPlatformLabel,
  getPlatformIcon,
  isValidSignal,
  filterSignalsByPlatform,
  filterSignalsByDateRange,
  sortSignalsByDate,
  groupSignalsByPlatform,
  calculateEngagementScore,
  truncateSignalContent,
  extractHashtags,
  extractMentions,
  isRecentSignal,
  getSignalUrl,
};