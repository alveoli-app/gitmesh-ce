/**
 * Shared Signals Storage
 * Storage utilities used by both community and premium editions
 * Storage Object
 * [tenantId]: {
 *    [userId]: {
 *      posts: []
 *      storageDate: '',
 *    }
 * }
 */

import moment from 'moment';

export const isStorageUpdating = ({ tenantId, userId }) => {
  const storage = localStorage.getItem('signalsResults');

  if (
    !storage
    || !JSON.parse(storage)?.[tenantId]?.[userId]
  ) {
    return null;
  }

  return !JSON.parse(storage)[tenantId][userId].storageDate;
};

export const shouldFetchNewResults = ({
  tenantId,
  userId,
}) => {
  const storage = localStorage.getItem('signalsResults');
  const currentDay = moment();

  // Fetch new results if it is a new day from the previous stored one,
  // or if storage is not set or if user is not set in storage
  if (
    !storage
    || !JSON.parse(storage)[tenantId]?.[userId]
    || !currentDay.isSame(
      JSON.parse(storage)[tenantId][userId].storageDate,
      'd',
    )
  ) {
    return true;
  }

  return false;
};

// Get posts from local storage
export const getResultsFromStorage = ({
  tenantId,
  userId,
}) => {
  const storage = localStorage.getItem('signalsResults');

  if (!storage) {
    return null;
  }

  return JSON.parse(storage)[tenantId][userId].posts;
};

// Set results in storage for the given tenant and user id
export const setResultsInStorage = ({
  storageDate,
  posts,
  tenantId,
  userId,
}) => {
  const storage = JSON.parse(
    localStorage.getItem('signalsResults') || '{}',
  );
  const payload = {
    posts,
    storageDate,
  };

  // Add/update user posts in tenantId
  if (storage[tenantId]) {
    storage[tenantId][userId] = payload;
  } else {
    storage[tenantId] = {
      [userId]: payload,
    };
  }

  localStorage.setItem(
    'signalsResults',
    JSON.stringify(storage),
  );
};

class SignalsStorage {
  constructor() {
    this.storageKey = 'gitmesh_signals';
  }

  // Get stored signals data
  get(key) {
    try {
      const data = localStorage.getItem(`${this.storageKey}_${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error reading from signals storage:', error);
      return null;
    }
  }

  // Set signals data in storage
  set(key, value) {
    try {
      localStorage.setItem(`${this.storageKey}_${key}`, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Error writing to signals storage:', error);
      return false;
    }
  }

  // Remove signals data from storage
  remove(key) {
    try {
      localStorage.removeItem(`${this.storageKey}_${key}`);
      return true;
    } catch (error) {
      console.error('Error removing from signals storage:', error);
      return false;
    }
  }

  // Clear all signals storage
  clear() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.storageKey)) {
          localStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      console.error('Error clearing signals storage:', error);
      return false;
    }
  }

  // Get user preferences
  getPreferences() {
    return this.get('preferences') || {};
  }

  // Set user preferences
  setPreferences(preferences) {
    return this.set('preferences', preferences);
  }

  // Get filters
  getFilters() {
    return this.get('filters') || {};
  }

  // Set filters
  setFilters(filters) {
    return this.set('filters', filters);
  }
}

export default new SignalsStorage();