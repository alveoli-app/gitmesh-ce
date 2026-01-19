/**
 * Shared Signals Formatter Utilities
 * Formatting functions for signals data display used by both editions
 */

import moment from 'moment';

/**
 * Format number with appropriate suffix (K, M, B)
 * @param {number} num - Number to format
 * @param {number} precision - Decimal precision (default: 1)
 * @returns {string} Formatted number string
 */
export const formatNumber = (num, precision = 1) => {
  if (typeof num !== 'number' || isNaN(num)) return '0';
  
  if (num < 1000) return num.toString();
  
  const suffixes = ['', 'K', 'M', 'B', 'T'];
  const tier = Math.log10(Math.abs(num)) / 3 | 0;
  
  if (tier === 0) return num.toString();
  
  const suffix = suffixes[tier];
  const scale = Math.pow(10, tier * 3);
  const scaled = num / scale;
  
  return scaled.toFixed(precision).replace(/\.0$/, '') + suffix;
};

/**
 * Format engagement metrics
 * @param {Object} metrics - Metrics object with likes, comments, shares, etc.
 * @returns {Object} Formatted metrics object
 */
export const formatEngagementMetrics = (metrics) => {
  if (!metrics || typeof metrics !== 'object') {
    return {
      likes: '0',
      comments: '0',
      shares: '0',
      views: '0',
    };
  }
  
  return {
    likes: formatNumber(metrics.likes || metrics.upvotes || 0),
    comments: formatNumber(metrics.comments || metrics.replies || 0),
    shares: formatNumber(metrics.shares || metrics.retweets || 0),
    views: formatNumber(metrics.views || 0),
  };
};

/**
 * Format date for display in different contexts
 * @param {string|Date} date - Date to format
 * @param {string} context - Display context ('list', 'detail', 'relative')
 * @returns {string} Formatted date string
 */
export const formatSignalDate = (date, context = 'list') => {
  if (!date) return '';
  
  const momentDate = moment(date);
  if (!momentDate.isValid()) return '';
  
  switch (context) {
    case 'relative':
      return momentDate.fromNow();
    
    case 'detail':
      return momentDate.format('MMMM DD, YYYY [at] h:mm A');
    
    case 'short':
      return momentDate.format('MMM DD');
    
    case 'time':
      return momentDate.format('h:mm A');
    
    case 'list':
    default:
      // Show relative time if within last 24 hours, otherwise show date
      const hoursAgo = moment().diff(momentDate, 'hours');
      if (hoursAgo < 24) {
        return momentDate.fromNow();
      }
      return momentDate.format('MMM DD, YYYY');
  }
};

/**
 * Format signal title for display
 * @param {string} title - Title to format
 * @param {number} maxLength - Maximum length (default: 100)
 * @returns {string} Formatted title
 */
export const formatSignalTitle = (title, maxLength = 100) => {
  if (!title || typeof title !== 'string') return '';
  
  const trimmedTitle = title.trim();
  
  if (trimmedTitle.length <= maxLength) return trimmedTitle;
  
  // Find the last space before the max length to avoid cutting words
  const truncated = trimmedTitle.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
};

/**
 * Format signal content for display
 * @param {string} content - Content to format
 * @param {number} maxLength - Maximum length (default: 300)
 * @param {boolean} preserveLineBreaks - Whether to preserve line breaks (default: false)
 * @returns {string} Formatted content
 */
export const formatSignalContent = (content, maxLength = 300, preserveLineBreaks = false) => {
  if (!content || typeof content !== 'string') return '';
  
  let formattedContent = content.trim();
  
  // Handle line breaks
  if (!preserveLineBreaks) {
    formattedContent = formattedContent.replace(/\n+/g, ' ');
  } else {
    formattedContent = formattedContent.replace(/\n/g, '<br>');
  }
  
  // Truncate if necessary
  if (formattedContent.length > maxLength) {
    const truncated = formattedContent.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.8) {
      formattedContent = truncated.substring(0, lastSpace) + '...';
    } else {
      formattedContent = truncated + '...';
    }
  }
  
  return formattedContent;
};

/**
 * Format platform name for display
 * @param {string} platform - Platform ID
 * @returns {string} Formatted platform name
 */
export const formatPlatformName = (platform) => {
  if (!platform || typeof platform !== 'string') return '';
  
  // Handle special cases
  const specialCases = {
    'github': 'GitHub',
    'stackoverflow': 'Stack Overflow',
    'hackernews': 'Hacker News',
    'producthunt': 'Product Hunt',
    'devto': 'DEV Community',
    'linkedin': 'LinkedIn',
    'youtube': 'YouTube',
  };
  
  if (specialCases[platform.toLowerCase()]) {
    return specialCases[platform.toLowerCase()];
  }
  
  // Capitalize first letter and handle camelCase
  return platform
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};

/**
 * Format URL for display (remove protocol, truncate if needed)
 * @param {string} url - URL to format
 * @param {number} maxLength - Maximum length (default: 50)
 * @returns {string} Formatted URL
 */
export const formatDisplayUrl = (url, maxLength = 50) => {
  if (!url || typeof url !== 'string') return '';
  
  // Remove protocol
  let displayUrl = url.replace(/^https?:\/\//, '');
  
  // Remove www.
  displayUrl = displayUrl.replace(/^www\./, '');
  
  // Remove trailing slash
  displayUrl = displayUrl.replace(/\/$/, '');
  
  // Truncate if necessary
  if (displayUrl.length > maxLength) {
    const parts = displayUrl.split('/');
    if (parts.length > 1) {
      // Try to keep domain and truncate path
      const domain = parts[0];
      const path = parts.slice(1).join('/');
      
      if (domain.length < maxLength - 10) {
        const availableLength = maxLength - domain.length - 4; // 4 for "/..."
        if (path.length > availableLength) {
          return `${domain}/...${path.substring(path.length - availableLength)}`;
        }
      }
    }
    
    return displayUrl.substring(0, maxLength - 3) + '...';
  }
  
  return displayUrl;
};

/**
 * Format hashtags for display
 * @param {Array} hashtags - Array of hashtags
 * @param {number} maxTags - Maximum number of tags to show (default: 5)
 * @returns {string} Formatted hashtags string
 */
export const formatHashtags = (hashtags, maxTags = 5) => {
  if (!hashtags || !Array.isArray(hashtags) || hashtags.length === 0) return '';
  
  const tagsToShow = hashtags.slice(0, maxTags);
  const formattedTags = tagsToShow.map(tag => `#${tag}`).join(' ');
  
  if (hashtags.length > maxTags) {
    return `${formattedTags} +${hashtags.length - maxTags} more`;
  }
  
  return formattedTags;
};

/**
 * Format mentions for display
 * @param {Array} mentions - Array of mentions
 * @param {number} maxMentions - Maximum number of mentions to show (default: 3)
 * @returns {string} Formatted mentions string
 */
export const formatMentions = (mentions, maxMentions = 3) => {
  if (!mentions || !Array.isArray(mentions) || mentions.length === 0) return '';
  
  const mentionsToShow = mentions.slice(0, maxMentions);
  const formattedMentions = mentionsToShow.map(mention => `@${mention}`).join(' ');
  
  if (mentions.length > maxMentions) {
    return `${formattedMentions} +${mentions.length - maxMentions} more`;
  }
  
  return formattedMentions;
};

/**
 * Format signal author name
 * @param {Object} author - Author object
 * @returns {string} Formatted author name
 */
export const formatAuthorName = (author) => {
  if (!author || typeof author !== 'object') return 'Unknown Author';
  
  if (author.displayName) return author.displayName;
  if (author.name) return author.name;
  if (author.username) return `@${author.username}`;
  if (author.handle) return `@${author.handle}`;
  
  return 'Unknown Author';
};

/**
 * Format signal status for display
 * @param {string} status - Signal status
 * @returns {Object} Formatted status with label and color
 */
export const formatSignalStatus = (status) => {
  const statusMap = {
    'active': { label: 'Active', color: 'success' },
    'pending': { label: 'Pending', color: 'warning' },
    'archived': { label: 'Archived', color: 'secondary' },
    'deleted': { label: 'Deleted', color: 'danger' },
    'draft': { label: 'Draft', color: 'info' },
  };
  
  return statusMap[status] || { label: status || 'Unknown', color: 'secondary' };
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (typeof bytes !== 'number' || bytes < 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  if (i === 0) return `${bytes} ${sizes[i]}`;
  
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

/**
 * Format duration (in seconds) for display
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
export const formatDuration = (seconds) => {
  if (typeof seconds !== 'number' || seconds < 0) return '0s';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
};

/**
 * Default export object with all formatters
 */
export default {
  formatNumber,
  formatEngagementMetrics,
  formatSignalDate,
  formatSignalTitle,
  formatSignalContent,
  formatPlatformName,
  formatDisplayUrl,
  formatHashtags,
  formatMentions,
  formatAuthorName,
  formatSignalStatus,
  formatFileSize,
  formatDuration,
};