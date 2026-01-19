import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useTopNavStore } from './topNav';

// Mock the config module
vi.mock('@/config', () => ({
  default: {
    isCommunityVersion: false, // Default to Enterprise Edition for tests
  },
}));

describe('TopNavStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('Edition-based tab availability', () => {
    it('should show only DevSpace tab in Community Edition', async () => {
      // Mock Community Edition
      const config = await import('@/config');
      vi.mocked(config.default).isCommunityVersion = true;
      
      const store = useTopNavStore();
      
      expect(store.availableTabs).toEqual(['devspace']);
      expect(store.isTabAvailable('devspace')).toBe(true);
      expect(store.isTabAvailable('signals')).toBe(false);
      expect(store.isTabAvailable('chat')).toBe(false);
    });

    it('should show all tabs in Enterprise Edition', async () => {
      // Mock Enterprise Edition
      const config = await import('@/config');
      vi.mocked(config.default).isCommunityVersion = false;
      
      const store = useTopNavStore();
      
      expect(store.availableTabs).toEqual(['signals', 'chat', 'devspace']);
      expect(store.isTabAvailable('devspace')).toBe(true);
      expect(store.isTabAvailable('signals')).toBe(true);
      expect(store.isTabAvailable('chat')).toBe(true);
    });
  });

  describe('Tab selection and migration', () => {
    it('should migrate from sentinel back to signals', () => {
      // Setup localStorage with 'sentinel' data (from previous implementation)
      localStorage.setItem('topNav:v1', JSON.stringify({
        selected: 'sentinel',
        lastVisited: {
          sentinel: '/sentinel/home',
          chat: '/chat',
          devspace: '/devspace'
        }
      }));

      const store = useTopNavStore();
      store.init();

      expect(store.selected).toBe('signals');
      expect(store.lastVisited.signals).toBe('/sentinel/home');
      expect(store.lastVisited.sentinel).toBeUndefined();
    });

    it('should only allow setting available tabs', async () => {
      // Mock Community Edition
      const config = await import('@/config');
      vi.mocked(config.default).isCommunityVersion = true;
      
      const store = useTopNavStore();
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Try to set signals tab in Community Edition
      store.set('signals');
      
      // Should remain on devspace (default)
      expect(store.selected).toBe('devspace');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Tab 'signals' is not available in current edition")
      );

      consoleSpy.mockRestore();
    });

    it('should allow setting available tabs in Enterprise Edition', async () => {
      // Mock Enterprise Edition
      const config = await import('@/config');
      vi.mocked(config.default).isCommunityVersion = false;
      
      const store = useTopNavStore();

      store.set('signals');
      expect(store.selected).toBe('signals');

      store.set('chat');
      expect(store.selected).toBe('chat');

      store.set('devspace');
      expect(store.selected).toBe('devspace');
    });
  });

  describe('Default tab selection', () => {
    it('should default to devspace in Community Edition', async () => {
      // Mock Community Edition
      const config = await import('@/config');
      vi.mocked(config.default).isCommunityVersion = true;
      
      const store = useTopNavStore();
      
      expect(store.getDefaultTab()).toBe('devspace');
      expect(store.selected).toBe('devspace');
    });

    it('should default to signals in Enterprise Edition', async () => {
      // Mock Enterprise Edition
      const config = await import('@/config');
      vi.mocked(config.default).isCommunityVersion = false;
      
      const store = useTopNavStore();
      
      expect(store.getDefaultTab()).toBe('signals');
    });
  });

  describe('Last visited paths', () => {
    it('should persist last visited paths', () => {
      const store = useTopNavStore();
      
      store.setLastVisited('devspace', '/devspace/overview');
      store.setLastVisited('signals', '/signals/dashboard');
      
      expect(store.lastVisited.devspace).toBe('/devspace/overview');
      expect(store.lastVisited.signals).toBe('/signals/dashboard');
      
      // Check localStorage persistence
      const stored = JSON.parse(localStorage.getItem('topNav:v1') || '{}');
      expect(stored.lastVisited.devspace).toBe('/devspace/overview');
      expect(stored.lastVisited.sentinel).toBe('/sentinel/home');
    });
  });
});