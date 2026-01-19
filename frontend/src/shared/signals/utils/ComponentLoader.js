/**
 * Dynamic Component Loader for Signals
 * Handles loading components from different editions based on availability
 */

/**
 * Check if we're in premium edition environment
 * @returns {boolean} True if premium edition is available
 */
export const isPremiumEdition = () => {
  // Check if premium modules are available
  try {
    // Try to access a premium-specific module to determine edition
    require.resolve('@/premium/signals/signals-module.js');
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Check if a premium component exists
 * @param {string} componentPath - Path to the premium component
 * @returns {boolean} True if component exists
 */
export const premiumComponentExists = (componentPath) => {
  try {
    require.resolve(componentPath);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Dynamically load a signals component based on edition
 * @param {string} componentName - Name of the component
 * @param {string} componentType - Type of component (pages, components, etc.)
 * @param {string} subPath - Optional sub-path within the component type
 * @returns {Function} Component loader function
 */
export const loadSignalsComponent = (componentName, componentType = 'components', subPath = '') => {
  const basePath = subPath ? `${componentType}/${subPath}` : componentType;
  
  // Try premium edition first if available
  if (isPremiumEdition()) {
    const premiumPath = `@/premium/signals/${basePath}/${componentName}.vue`;
    
    if (premiumComponentExists(premiumPath)) {
      return () => import(premiumPath);
    }
  }
  
  // Fallback to community edition
  const communityPath = `@/modules/signals/${basePath}/${componentName}.vue`;
  return () => import(communityPath);
};

/**
 * Load signals service based on edition
 * @returns {Promise} Service class
 */
export const loadSignalsService = async () => {
  // Always use shared service
  const { SignalsService } = await import('@/shared/signals/services/SignalsService');
  return SignalsService;
};

/**
 * Load signals store based on edition
 * @returns {Promise} Store module
 */
export const loadSignalsStore = async () => {
  // Try premium edition first if available
  if (isPremiumEdition()) {
    try {
      const premiumStore = await import('@/premium/signals/store');
      return premiumStore.default;
    } catch (error) {
      console.warn('Premium signals store not found, falling back to community edition');
    }
  }
  
  // Fallback to community edition
  const communityStore = await import('@/modules/signals/store');
  return communityStore.default;
};

/**
 * Load signals utilities based on edition
 * @param {string} utilityName - Name of the utility
 * @returns {Promise} Utility module
 */
export const loadSignalsUtility = async (utilityName) => {
  // Always use shared utilities
  const utilityModule = await import(`@/shared/signals/utils/${utilityName}`);
  return utilityModule.default;
};

/**
 * Load platform-specific constants
 * @returns {Promise} Platform constants
 */
export const loadPlatformConstants = async () => {
  // Always use shared constants
  const constants = await import('@/shared/signals/constants/signals-platforms.json');
  return constants.default;
};

/**
 * Load date published constants
 * @returns {Promise} Date published constants
 */
export const loadDatePublishedConstants = async () => {
  // Always use shared constants
  const constants = await import('@/shared/signals/constants/signals-date-published.json');
  return constants.default;
};

/**
 * Create a component resolver that handles edition-based loading
 * @param {Object} componentMap - Map of component names to their configurations
 * @returns {Object} Resolved components
 */
export const createComponentResolver = (componentMap) => {
  const resolvedComponents = {};
  
  Object.entries(componentMap).forEach(([key, config]) => {
    const { name, type = 'components', subPath = '', fallback = null } = config;
    
    resolvedComponents[key] = {
      component: loadSignalsComponent(name, type, subPath),
      fallback: fallback ? loadSignalsComponent(fallback, type, subPath) : null,
    };
  });
  
  return resolvedComponents;
};

/**
 * Create a dynamic import resolver for signals modules
 * @param {string} modulePath - Path to the module
 * @param {string} fallbackPath - Fallback path if primary fails
 * @returns {Function} Dynamic import function
 */
export const createDynamicImport = (modulePath, fallbackPath = null) => {
  return async () => {
    try {
      // Try primary path first
      return await import(modulePath);
    } catch (error) {
      if (fallbackPath) {
        try {
          // Try fallback path
          return await import(fallbackPath);
        } catch (fallbackError) {
          console.error(`Failed to load module: ${modulePath} and fallback: ${fallbackPath}`, fallbackError);
          throw fallbackError;
        }
      }
      
      console.error(`Failed to load module: ${modulePath}`, error);
      throw error;
    }
  };
};

/**
 * Resolve cross-edition dependencies for a component
 * @param {Object} dependencies - Object with dependency configurations
 * @returns {Promise<Object>} Resolved dependencies
 */
export const resolveCrossEditionDependencies = async (dependencies) => {
  const resolved = {};
  
  for (const [key, config] of Object.entries(dependencies)) {
    try {
      if (config.type === 'component') {
        resolved[key] = loadSignalsComponent(config.name, config.componentType, config.subPath);
      } else if (config.type === 'service') {
        resolved[key] = await loadSignalsService();
      } else if (config.type === 'utility') {
        resolved[key] = await loadSignalsUtility(config.name);
      } else if (config.type === 'constants') {
        if (config.name === 'platforms') {
          resolved[key] = await loadPlatformConstants();
        } else if (config.name === 'datePublished') {
          resolved[key] = await loadDatePublishedConstants();
        }
      } else if (config.type === 'store') {
        resolved[key] = await loadSignalsStore();
      }
    } catch (error) {
      console.error(`Failed to resolve dependency: ${key}`, error);
      
      // Use fallback if available
      if (config.fallback) {
        try {
          resolved[key] = await import(config.fallback);
        } catch (fallbackError) {
          console.error(`Failed to load fallback for dependency: ${key}`, fallbackError);
        }
      }
    }
  }
  
  return resolved;
};

/**
 * Create a mixin for components that need cross-edition dependencies
 * @param {Object} dependencyConfig - Configuration for dependencies
 * @returns {Object} Vue mixin
 */
export const createCrossEditionMixin = (dependencyConfig) => {
  return {
    data() {
      return {
        crossEditionDependencies: {},
        dependenciesLoaded: false,
        dependencyLoadError: null,
      };
    },
    
    async created() {
      try {
        this.crossEditionDependencies = await resolveCrossEditionDependencies(dependencyConfig);
        this.dependenciesLoaded = true;
      } catch (error) {
        this.dependencyLoadError = error;
        console.error('Failed to load cross-edition dependencies:', error);
      }
    },
    
    methods: {
      /**
       * Get a resolved dependency
       * @param {string} key - Dependency key
       * @returns {*} Resolved dependency or null
       */
      getDependency(key) {
        return this.crossEditionDependencies[key] || null;
      },
      
      /**
       * Check if dependencies are loaded
       * @returns {boolean} True if all dependencies are loaded
       */
      areDependenciesLoaded() {
        return this.dependenciesLoaded && !this.dependencyLoadError;
      },
    },
  };
};

/**
 * Default export with all utilities
 */
export default {
  isPremiumEdition,
  premiumComponentExists,
  loadSignalsComponent,
  loadSignalsService,
  loadSignalsStore,
  loadSignalsUtility,
  loadPlatformConstants,
  loadDatePublishedConstants,
  createComponentResolver,
  createDynamicImport,
  resolveCrossEditionDependencies,
  createCrossEditionMixin,
};