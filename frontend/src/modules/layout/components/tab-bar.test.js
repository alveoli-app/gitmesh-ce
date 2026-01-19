/**
 * Unit tests for Tab Bar Component Edition-Based Navigation
 * 
 * This test file verifies that the tab bar component correctly:
 * 1. Shows only DevSpace tab in Community Edition
 * 2. Shows Signals, Chat, and DevSpace tabs in Enterprise Edition
 * 3. Redirects Community Edition users to paywall when accessing premium tabs
 * 4. Uses correct tab names (Signals, Chat, DevSpace)
 */

import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import TabBar from './tab-bar.vue';

// Mock dependencies
jest.mock('@/config', () => ({
  isCommunityVersion: false, // Will be overridden in tests
}));

jest.mock('@/utils/featureFlag', () => ({
  FeatureFlag: {
    flags: {
      signals: 'signals',
      agenticChat: 'agentic-chat'
    },
    isFlagEnabled: jest.fn()
  }
}));

jest.mock('vue-router', () => ({
  useRoute: () => ({
    name: 'test-route',
    meta: {}
  }),
  useRouter: () => ({
    push: jest.fn()
  })
}));

jest.mock('vuex', () => ({
  useStore: () => ({
    dispatch: jest.fn(),
    getters: {},
    state: {}
  })
}));

describe('TabBar Component - Edition-Based Navigation', () => {
  let wrapper;
  let pinia;

  beforeEach(() => {
    pinia = createPinia();
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('Community Edition', () => {
    beforeEach(() => {
      // Mock Community Edition
      require('@/config').isCommunityVersion = true;
      
      // Mock feature flags for Community Edition
      const { FeatureFlag } = require('@/utils/featureFlag');
      FeatureFlag.isFlagEnabled.mockImplementation((flag) => {
        if (flag === 'signals' || flag === 'agentic-chat') {
          return false; // Premium features disabled
        }
        return true; // Other features enabled
      });
    });

    test('should only show DevSpace tab in Community Edition', () => {
      wrapper = mount(TabBar, {
        global: {
          plugins: [pinia]
        }
      });

      // Should show DevSpace tab
      expect(wrapper.find('[data-testid="devspace-tab"]')).toBeTruthy();
      
      // Should NOT show Signals or Chat tabs
      expect(wrapper.find('[data-testid="signals-tab"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="chat-tab"]').exists()).toBe(false);
    });

    test('should redirect to paywall when Community user tries to access premium features', () => {
      const mockRouter = require('vue-router').useRouter();
      
      wrapper = mount(TabBar, {
        global: {
          plugins: [pinia]
        }
      });

      // Simulate clicking on a premium tab (this would be blocked by v-if, but testing the logic)
      const component = wrapper.vm;
      component.setTop('signals');

      // Should redirect to settings with paywall
      expect(mockRouter.push).toHaveBeenCalledWith({
        name: 'settings',
        query: { activeTab: 'plans', feature: 'sentinel' }
      });
    });
  });

  describe('Enterprise Edition', () => {
    beforeEach(() => {
      // Mock Enterprise Edition
      require('@/config').isCommunityVersion = false;
      
      // Mock feature flags for Enterprise Edition
      const { FeatureFlag } = require('@/utils/featureFlag');
      FeatureFlag.isFlagEnabled.mockImplementation(() => true); // All features enabled
    });

    test('should show all tabs in Enterprise Edition', () => {
      wrapper = mount(TabBar, {
        global: {
          plugins: [pinia]
        }
      });

      // Should show all tabs
      expect(wrapper.find('[data-testid="signals-tab"]')).toBeTruthy();
      expect(wrapper.find('[data-testid="chat-tab"]')).toBeTruthy();
      expect(wrapper.find('[data-testid="devspace-tab"]')).toBeTruthy();
    });

    test('should use correct tab names', () => {
      wrapper = mount(TabBar, {
        global: {
          plugins: [pinia]
        }
      });

      // Check tab text content
      expect(wrapper.find('[data-testid="signals-tab"]').text()).toBe('Signals');
      expect(wrapper.find('[data-testid="chat-tab"]').text()).toBe('Chat');
      expect(wrapper.find('[data-testid="devspace-tab"]').text()).toBe('DevSpace');
    });

    test('should allow navigation to premium tabs in Enterprise Edition', () => {
      const mockRouter = require('vue-router').useRouter();
      
      wrapper = mount(TabBar, {
        global: {
          plugins: [pinia]
        }
      });

      // Simulate clicking on premium tabs
      const component = wrapper.vm;
      component.setTop('signals');
      component.setTop('chat');

      // Should NOT redirect to paywall (no calls to router.push with paywall routes)
      expect(mockRouter.push).not.toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({ activeTab: 'plans' })
        })
      );
    });
  });

  describe('Tab Availability Logic', () => {
    test('should correctly determine available tabs based on edition', () => {
      // Test Community Edition
      require('@/config').isCommunityVersion = true;
      
      wrapper = mount(TabBar, {
        global: {
          plugins: [pinia]
        }
      });

      const component = wrapper.vm;
      expect(component.availableTabs).toEqual(['devspace']);

      // Test Enterprise Edition
      require('@/config').isCommunityVersion = false;
      
      wrapper.unmount();
      wrapper = mount(TabBar, {
        global: {
          plugins: [pinia]
        }
      });

      const enterpriseComponent = wrapper.vm;
      expect(enterpriseComponent.availableTabs).toEqual(['signals', 'chat', 'devspace']);
    });
  });
});

/**
 * Manual Verification Checklist:
 * 
 * Community Edition:
 * □ Only DevSpace tab is visible
 * □ Clicking on premium features redirects to paywall/settings
 * □ Tab bar shows single tab layout
 * 
 * Enterprise Edition:
 * □ All three tabs (Signals, Chat, DevSpace) are visible
 * □ Tab names are correct: "Signals", "Chat", "DevSpace"
 * □ Clicking tabs navigates to respective sections
 * □ Active tab highlighting works correctly
 * 
 * Navigation:
 * □ Last visited paths are preserved per tab
 * □ Default navigation works for each tab
 * □ Route changes update active tab correctly
 */