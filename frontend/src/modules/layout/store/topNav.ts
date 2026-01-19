import { defineStore } from 'pinia';
import config from '@/config';

const STORAGE_KEY = 'topNav:v1';

// Define tab types
export type TabType = 'signals' | 'chat' | 'devspace';

export const useTopNavStore = defineStore('topNav', {
  state: () => ({
    selected: 'devspace' as TabType, // Default to devspace as it's available in all editions
    lastVisited: {
      signals: '' as string,
      chat: '' as string,
      devspace: '' as string,
    } as Record<string, string>,
  }),
  
  getters: {
    // Computed property to determine available tabs based on edition
    availableTabs(): TabType[] {
      if (config.isCommunityVersion) {
        // Community Edition: Signals and DevSpace tabs (Chat is premium-only)
        return ['signals', 'devspace'];
      } else {
        // Enterprise Edition: Signals, Chat, and DevSpace tabs
        return ['signals', 'chat', 'devspace'];
      }
    },
    
    // Check if a specific tab is available in current edition
    isTabAvailable(): (tab: TabType) => boolean {
      return (tab: TabType) => {
        const baseAvailable = this.availableTabs.includes(tab);
        
        // Additional checks for specific tabs
        if (tab === 'chat') {
          // Chat is premium-only, not available in Community Edition
          return !config.isCommunityVersion && baseAvailable;
        }
        
        if (tab === 'signals') {
          // Signals is available in both editions
          return baseAvailable;
        }
        
        if (tab === 'devspace') {
          // DevSpace is available in all editions
          return baseAvailable;
        }
        
        return baseAvailable;
      };
    },
  },
  
  actions: {
    init() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          
          // Handle migration from 'sentinel' back to 'signals' (if needed)
          // Note: In community edition, sentinel is not available
          if (parsed.selected === 'sentinel') {
            parsed.selected = 'signals';
          }
          if (parsed.lastVisited?.sentinel) {
            parsed.lastVisited.signals = parsed.lastVisited.sentinel;
            delete parsed.lastVisited.sentinel;
          }
          
          // Only set selected tab if it's available in current edition
          if (parsed.selected && this.isTabAvailable(parsed.selected)) {
            this.selected = parsed.selected;
          } else {
            // Fallback to first available tab if selected tab is not available
            this.selected = this.availableTabs[0] || 'devspace';
          }
          
          if (parsed.lastVisited) {
            this.lastVisited = { ...this.lastVisited, ...parsed.lastVisited };
          }
        } else {
          // Initialize with first available tab
          this.selected = this.availableTabs[0] || 'devspace';
        }
      } catch (e) {
        // Fallback to first available tab on error
        this.selected = this.availableTabs[0] || 'devspace';
      }
    },

    persist() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
          selected: this.selected, 
          lastVisited: this.lastVisited 
        }));
      } catch (e) {
        // ignore
      }
    },

    set(selected: TabType) {
      // Only allow setting tabs that are available in current edition
      if (this.isTabAvailable(selected)) {
        this.selected = selected;
        this.persist();
      } else {
        console.warn(`Tab '${selected}' is not available in current edition. Available tabs:`, this.availableTabs);
        
        // Handle premium feature access attempts in Community Edition
        if (config.isCommunityVersion && selected === 'chat') {
          console.log(`Community Edition user attempted to access premium tab: ${selected}`);
          // Don't set the tab, let the calling component handle the redirect
          return;
        }
        
        // Fallback to first available tab if the requested tab is not available
        const fallbackTab = this.getDefaultTab();
        if (fallbackTab !== selected) {
          this.selected = fallbackTab;
          this.persist();
        }
      }
    },

    setLastVisited(top: TabType, path: string) {
      this.lastVisited[top] = path;
      this.persist();
    },
    
    // Helper method to get the default tab for current edition
    getDefaultTab(): TabType {
      return this.availableTabs[0] || 'devspace';
    },
  },
});
