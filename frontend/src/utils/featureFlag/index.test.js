import { FeatureFlag, FEATURE_FLAGS } from './index.js';

// Mock the config module
const mockConfig = {
  edition: 'gitmesh',
  isCommunityVersion: true,
  unleash: {
    url: '',
    apiKey: ''
  }
};

// Mock store
const mockStore = {
  state: {
    auth: {
      currentTenant: null
    }
  }
};

jest.mock('@/config', () => mockConfig);
jest.mock('@/store', () => ({
  store: mockStore
}));
jest.mock('@/utils/logRocket', () => ({
  useLogRocket: () => ({
    init: jest.fn(),
    captureException: jest.fn()
  })
}));

describe('FeatureFlagService', () => {
  beforeEach(() => {
    // Reset console.log mock
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Reset store state
    mockStore.state.auth.currentTenant = null;
    
    // Reset window.store
    delete window.store;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Community Edition', () => {
    beforeEach(() => {
      mockConfig.edition = 'gitmesh';
      mockConfig.isCommunityVersion = true;
    });

    test('should enable signals flag in Community Edition', () => {
      const result = FeatureFlag.isFlagEnabled(FEATURE_FLAGS.signals);
      expect(result).toBe(true);
    });

    test('should disable signalsSentinel flag in Community Edition', () => {
      const result = FeatureFlag.isFlagEnabled(FEATURE_FLAGS.signalsSentinel);
      expect(result).toBe(false);
    });

    test('should disable agenticChat flag in Community Edition', () => {
      const result = FeatureFlag.isFlagEnabled(FEATURE_FLAGS.agenticChat);
      expect(result).toBe(false);
    });

    test('should enable other flags in Community Edition', () => {
      const result = FeatureFlag.isFlagEnabled(FEATURE_FLAGS.organizations);
      expect(result).toBe(true);
    });

    test('should log edition status for debugging', () => {
      FeatureFlag.isFlagEnabled(FEATURE_FLAGS.signals);
      expect(console.log).toHaveBeenCalledWith('FeatureFlagService: Edition check', {
        edition: 'gitmesh',
        isCommunityVersion: true,
        flag: 'signals'
      });
    });
  });

  describe('Enterprise Edition', () => {
    beforeEach(() => {
      mockConfig.edition = 'ee';
      mockConfig.isCommunityVersion = false;
    });

    test('should enable signals flag in Enterprise Edition with enterprise plan', () => {
      mockStore.state.auth.currentTenant = { plan: 'Pro' };
      const result = FeatureFlag.isFlagEnabled(FEATURE_FLAGS.signals);
      expect(result).toBe(true);
    });

    test('should enable signalsSentinel flag in Enterprise Edition with enterprise plan', () => {
      mockStore.state.auth.currentTenant = { plan: 'Teams+' };
      const result = FeatureFlag.isFlagEnabled(FEATURE_FLAGS.signalsSentinel);
      expect(result).toBe(true);
    });

    test('should disable signals flag in Enterprise Edition with non-enterprise plan', () => {
      mockStore.state.auth.currentTenant = { plan: 'Basic' };
      const result = FeatureFlag.isFlagEnabled(FEATURE_FLAGS.signals);
      expect(result).toBe(false);
    });

    test('should enable signals flag with Pro plan', () => {
      mockStore.state.auth.currentTenant = { plan: 'Pro' };
      const result = FeatureFlag.isFlagEnabled(FEATURE_FLAGS.signals);
      expect(result).toBe(true);
    });

    test('should enable signals flag with Enterprise plan', () => {
      mockStore.state.auth.currentTenant = { plan: 'Enterprise' };
      const result = FeatureFlag.isFlagEnabled(FEATURE_FLAGS.signals);
      expect(result).toBe(true);
    });

    test('should enable signals flag with Teams+ plan', () => {
      mockStore.state.auth.currentTenant = { plan: 'Teams+' };
      const result = FeatureFlag.isFlagEnabled(FEATURE_FLAGS.signals);
      expect(result).toBe(true);
    });

    test('should default to enabled when no tenant found', () => {
      mockStore.state.auth.currentTenant = null;
      const result = FeatureFlag.isFlagEnabled(FEATURE_FLAGS.signals);
      expect(result).toBe(true);
    });

    test('should enable agenticChat flag in Enterprise Edition', () => {
      const result = FeatureFlag.isFlagEnabled(FEATURE_FLAGS.agenticChat);
      expect(result).toBe(true);
    });

    test('should enable all other flags in Enterprise Edition', () => {
      const result = FeatureFlag.isFlagEnabled(FEATURE_FLAGS.organizations);
      expect(result).toBe(true);
    });

    test('should log edition status for debugging', () => {
      FeatureFlag.isFlagEnabled(FEATURE_FLAGS.signals);
      expect(console.log).toHaveBeenCalledWith('FeatureFlagService: Edition check', {
        edition: 'ee',
        isCommunityVersion: false,
        flag: 'signals'
      });
    });

    test('should use window.store as fallback for tenant', () => {
      window.store = {
        state: {
          auth: {
            currentTenant: { plan: 'Pro' }
          }
        }
      };
      
      const result = FeatureFlag.isFlagEnabled(FEATURE_FLAGS.signals);
      expect(result).toBe(true);
    });
  });

  describe('Premium Edition', () => {
    beforeEach(() => {
      mockConfig.edition = 'premium';
      mockConfig.isCommunityVersion = false;
    });

    test('should enable signals flag in Premium Edition with enterprise plan', () => {
      mockStore.state.auth.currentTenant = { plan: 'Pro' };
      const result = FeatureFlag.isFlagEnabled(FEATURE_FLAGS.signals);
      expect(result).toBe(true);
    });

    test('should enable signalsSentinel flag in Premium Edition', () => {
      mockStore.state.auth.currentTenant = { plan: 'Teams+' };
      const result = FeatureFlag.isFlagEnabled(FEATURE_FLAGS.signalsSentinel);
      expect(result).toBe(true);
    });

    test('should enable agenticChat flag in Premium Edition', () => {
      const result = FeatureFlag.isFlagEnabled(FEATURE_FLAGS.agenticChat);
      expect(result).toBe(true);
    });
  });

  describe('Plan-based Access Control', () => {
    beforeEach(() => {
      mockConfig.edition = 'ee';
      mockConfig.isCommunityVersion = false;
    });

    test('should accept all enterprise plans for signals', () => {
      const enterprisePlans = ['Pro', 'Teams+', 'Enterprise'];
      
      enterprisePlans.forEach(plan => {
        mockStore.state.auth.currentTenant = { plan };
        const result = FeatureFlag.isFlagEnabled(FEATURE_FLAGS.signals);
        expect(result).toBe(true);
      });
    });

    test('should accept all enterprise plans for signalsSentinel', () => {
      const enterprisePlans = ['Pro', 'Teams+', 'Enterprise'];
      
      enterprisePlans.forEach(plan => {
        mockStore.state.auth.currentTenant = { plan };
        const result = FeatureFlag.isFlagEnabled(FEATURE_FLAGS.signalsSentinel);
        expect(result).toBe(true);
      });
    });

    test('should reject non-enterprise plans', () => {
      mockStore.state.auth.currentTenant = { plan: 'Basic' };
      const result = FeatureFlag.isFlagEnabled(FEATURE_FLAGS.signals);
      expect(result).toBe(false);
    });

    test('should log plan check details', () => {
      mockStore.state.auth.currentTenant = { plan: 'Pro' };
      FeatureFlag.isFlagEnabled(FEATURE_FLAGS.signals);
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Plan check for signals - Plan="Pro", HasAccess=true')
      );
    });

    test('should log when plan does not have access', () => {
      mockStore.state.auth.currentTenant = { plan: 'Basic' };
      FeatureFlag.isFlagEnabled(FEATURE_FLAGS.signals);
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Plan Basic does not have access to signals')
      );
    });
  });
});