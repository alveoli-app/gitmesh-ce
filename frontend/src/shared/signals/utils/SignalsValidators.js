/**
 * Shared Signals Validation Utilities
 * Validation functions for signals data and forms used by both editions
 */

import moment from 'moment';

/**
 * Validate email address format
 * @param {string} email - Email to validate
 * @returns {boolean} True if email is valid
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if URL is valid
 */
export const isValidUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  
  try {
    new URL(url.startsWith('http') ? url : `https://${url}`);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate signal title
 * @param {string} title - Title to validate
 * @param {number} minLength - Minimum length (default: 1)
 * @param {number} maxLength - Maximum length (default: 200)
 * @returns {Object} Validation result with isValid and message
 */
export const validateSignalTitle = (title, minLength = 1, maxLength = 200) => {
  if (!title || typeof title !== 'string') {
    return { isValid: false, message: 'Title is required' };
  }
  
  const trimmedTitle = title.trim();
  
  if (trimmedTitle.length < minLength) {
    return { isValid: false, message: `Title must be at least ${minLength} characters` };
  }
  
  if (trimmedTitle.length > maxLength) {
    return { isValid: false, message: `Title must be no more than ${maxLength} characters` };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validate signal content
 * @param {string} content - Content to validate
 * @param {number} maxLength - Maximum length (default: 5000)
 * @returns {Object} Validation result with isValid and message
 */
export const validateSignalContent = (content, maxLength = 5000) => {
  if (!content || typeof content !== 'string') {
    return { isValid: false, message: 'Content is required' };
  }
  
  if (content.trim().length === 0) {
    return { isValid: false, message: 'Content cannot be empty' };
  }
  
  if (content.length > maxLength) {
    return { isValid: false, message: `Content must be no more than ${maxLength} characters` };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validate platform selection
 * @param {string} platform - Platform to validate
 * @param {Array} availablePlatforms - Array of available platform IDs
 * @returns {Object} Validation result with isValid and message
 */
export const validatePlatform = (platform, availablePlatforms = []) => {
  if (!platform || typeof platform !== 'string') {
    return { isValid: false, message: 'Platform is required' };
  }
  
  if (availablePlatforms.length > 0 && !availablePlatforms.includes(platform)) {
    return { isValid: false, message: 'Invalid platform selected' };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validate date range
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date
 * @returns {Object} Validation result with isValid and message
 */
export const validateDateRange = (startDate, endDate) => {
  if (!startDate && !endDate) {
    return { isValid: true, message: '' };
  }
  
  if (startDate && !moment(startDate).isValid()) {
    return { isValid: false, message: 'Invalid start date' };
  }
  
  if (endDate && !moment(endDate).isValid()) {
    return { isValid: false, message: 'Invalid end date' };
  }
  
  if (startDate && endDate) {
    const start = moment(startDate);
    const end = moment(endDate);
    
    if (start.isAfter(end)) {
      return { isValid: false, message: 'Start date must be before end date' };
    }
    
    // Check if date range is not too large (e.g., more than 1 year)
    if (end.diff(start, 'days') > 365) {
      return { isValid: false, message: 'Date range cannot exceed 1 year' };
    }
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validate keywords array
 * @param {Array} keywords - Keywords to validate
 * @param {number} maxKeywords - Maximum number of keywords (default: 10)
 * @param {number} maxKeywordLength - Maximum length per keyword (default: 50)
 * @returns {Object} Validation result with isValid and message
 */
export const validateKeywords = (keywords, maxKeywords = 10, maxKeywordLength = 50) => {
  if (!keywords) {
    return { isValid: true, message: '' };
  }
  
  if (!Array.isArray(keywords)) {
    return { isValid: false, message: 'Keywords must be an array' };
  }
  
  if (keywords.length > maxKeywords) {
    return { isValid: false, message: `Maximum ${maxKeywords} keywords allowed` };
  }
  
  for (const keyword of keywords) {
    if (typeof keyword !== 'string') {
      return { isValid: false, message: 'All keywords must be strings' };
    }
    
    if (keyword.trim().length === 0) {
      return { isValid: false, message: 'Keywords cannot be empty' };
    }
    
    if (keyword.length > maxKeywordLength) {
      return { isValid: false, message: `Keywords must be no more than ${maxKeywordLength} characters` };
    }
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validate signals filter object
 * @param {Object} filter - Filter object to validate
 * @returns {Object} Validation result with isValid and message
 */
export const validateSignalsFilter = (filter) => {
  if (!filter || typeof filter !== 'object') {
    return { isValid: true, message: '' }; // Empty filter is valid
  }
  
  // Validate platforms
  if (filter.platforms) {
    if (!Array.isArray(filter.platforms)) {
      return { isValid: false, message: 'Platforms filter must be an array' };
    }
  }
  
  // Validate date range
  if (filter.startDate || filter.endDate) {
    const dateValidation = validateDateRange(filter.startDate, filter.endDate);
    if (!dateValidation.isValid) {
      return dateValidation;
    }
  }
  
  // Validate keywords
  if (filter.keywords) {
    const keywordValidation = validateKeywords(filter.keywords);
    if (!keywordValidation.isValid) {
      return keywordValidation;
    }
  }
  
  // Validate limit and offset
  if (filter.limit !== undefined) {
    if (!Number.isInteger(filter.limit) || filter.limit < 1 || filter.limit > 100) {
      return { isValid: false, message: 'Limit must be an integer between 1 and 100' };
    }
  }
  
  if (filter.offset !== undefined) {
    if (!Number.isInteger(filter.offset) || filter.offset < 0) {
      return { isValid: false, message: 'Offset must be a non-negative integer' };
    }
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validate email digest settings
 * @param {Object} settings - Email digest settings to validate
 * @returns {Object} Validation result with isValid and message
 */
export const validateEmailDigestSettings = (settings) => {
  if (!settings || typeof settings !== 'object') {
    return { isValid: false, message: 'Settings object is required' };
  }
  
  // Validate email
  if (settings.email) {
    if (!isValidEmail(settings.email)) {
      return { isValid: false, message: 'Invalid email address' };
    }
  }
  
  // Validate frequency
  const validFrequencies = ['daily', 'weekly', 'monthly'];
  if (settings.frequency && !validFrequencies.includes(settings.frequency)) {
    return { isValid: false, message: 'Invalid frequency. Must be daily, weekly, or monthly' };
  }
  
  // Validate enabled flag
  if (settings.enabled !== undefined && typeof settings.enabled !== 'boolean') {
    return { isValid: false, message: 'Enabled must be a boolean value' };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validate signal action
 * @param {Object} action - Action object to validate
 * @returns {Object} Validation result with isValid and message
 */
export const validateSignalAction = (action) => {
  if (!action || typeof action !== 'object') {
    return { isValid: false, message: 'Action object is required' };
  }
  
  // Validate action type
  const validTypes = ['like', 'comment', 'share', 'bookmark', 'follow'];
  if (!action.type || !validTypes.includes(action.type)) {
    return { isValid: false, message: 'Invalid action type' };
  }
  
  // Validate comment content if action is comment
  if (action.type === 'comment') {
    if (!action.content || typeof action.content !== 'string' || action.content.trim().length === 0) {
      return { isValid: false, message: 'Comment content is required' };
    }
    
    if (action.content.length > 1000) {
      return { isValid: false, message: 'Comment must be no more than 1000 characters' };
    }
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validate complete signal object
 * @param {Object} signal - Signal object to validate
 * @returns {Object} Validation result with isValid, message, and field-specific errors
 */
export const validateSignal = (signal) => {
  if (!signal || typeof signal !== 'object') {
    return { isValid: false, message: 'Signal object is required', errors: {} };
  }
  
  const errors = {};
  let isValid = true;
  
  // Validate title
  const titleValidation = validateSignalTitle(signal.title);
  if (!titleValidation.isValid) {
    errors.title = titleValidation.message;
    isValid = false;
  }
  
  // Validate content
  if (signal.content) {
    const contentValidation = validateSignalContent(signal.content);
    if (!contentValidation.isValid) {
      errors.content = contentValidation.message;
      isValid = false;
    }
  }
  
  // Validate platform
  const platformValidation = validatePlatform(signal.platform);
  if (!platformValidation.isValid) {
    errors.platform = platformValidation.message;
    isValid = false;
  }
  
  // Validate URL if present
  if (signal.url && !isValidUrl(signal.url)) {
    errors.url = 'Invalid URL format';
    isValid = false;
  }
  
  return {
    isValid,
    message: isValid ? 'Signal is valid' : 'Signal validation failed',
    errors,
  };
};

/**
 * Default export object with all validators
 */
export default {
  isValidEmail,
  isValidUrl,
  validateSignalTitle,
  validateSignalContent,
  validatePlatform,
  validateDateRange,
  validateKeywords,
  validateSignalsFilter,
  validateEmailDigestSettings,
  validateSignalAction,
  validateSignal,
};