import { defineStore } from 'pinia';
import { useTopNavStore, type TabType } from '@/modules/layout/store/topNav';

export interface Tab {
  id: string;
  path: string;
  title: string;
  name?: string;
  query?: Record<string, any>;
  params?: Record<string, any>;
  meta?: Record<string, any>;
  lastAccessed: number;
}

type Group = {
  tabs: Tab[];
  activeTabPath: string;
};

export const useTabsStore = defineStore('tabs', {
  state: () => ({
    groups: {
      signals: { tabs: [] as Tab[], activeTabPath: '' } as Group,
      chat: { tabs: [] as Tab[], activeTabPath: '' } as Group,
      devspace: { tabs: [] as Tab[], activeTabPath: '' } as Group,
    },
    inactivityTimer: null as any,
  }),

  actions: {
    // Helper to get current group based on top nav
    _currentGroup() {
      const topNav = useTopNavStore();
      // @ts-ignore
      return this.groups[topNav.selected];
    },

    addTab(route: any) {
      const group = this._currentGroup();
      const path = route.fullPath || route.path;
      const now = Date.now();

      // Don't add login, error pages
      if (route.name === 'login' || route.name === 'error') return;

      const existingIndex = group.tabs.findIndex(t =>
        t.name === route.name && JSON.stringify(t.params) === JSON.stringify(route.params)
      );

      if (existingIndex !== -1) {
        group.tabs[existingIndex].path = path;
        group.tabs[existingIndex].query = route.query;
        group.tabs[existingIndex].params = route.params;
        group.tabs[existingIndex].lastAccessed = now;
        group.activeTabPath = path;
        return;
      }

      const title = route.meta?.title || (route.name as string) || 'Untitled';
      group.tabs.push({
        id: Math.random().toString(36).substring(2, 9),
        path,
        title,
        name: route.name as string,
        query: route.query,
        params: route.params,
        meta: route.meta,
        lastAccessed: now,
      });

      group.activeTabPath = path;
    },

    removeTab(path: string) {
      const group = this._currentGroup();
      const index = group.tabs.findIndex((t) => t.path === path);
      if (index === -1) return;

      group.tabs.splice(index, 1);

      if (group.activeTabPath === path) {
        const nextTab = group.tabs[index] || group.tabs[index - 1];
        group.activeTabPath = nextTab ? nextTab.path : '';
      }
    },

    setActiveTab(path: string) {
      const group = this._currentGroup();
      group.activeTabPath = path;
      const tab = group.tabs.find(t => t.path === path);
      if (tab) tab.lastAccessed = Date.now();
    },

    closeOtherTabs(path: string) {
      const group = this._currentGroup();
      group.tabs = group.tabs.filter((t) => t.path === path);
      group.activeTabPath = path;
    },

    closeAllTabs() {
      const group = this._currentGroup();
      group.tabs = [];
      group.activeTabPath = '';
    },

    checkInactivity() {
      const now = Date.now();
      const AUTO_CLOSE_THRESHOLD = 30 * 60 * 1000;
      Object.keys(this.groups).forEach((k) => {
        // @ts-ignore
        const group: Group = this.groups[k];
        group.tabs = group.tabs.filter(tab => {
          if (tab.path === group.activeTabPath) return true;
          return (now - tab.lastAccessed) < AUTO_CLOSE_THRESHOLD;
        });
      });
    },

    // Utilities for other components
    getTabsFor(top: TabType) {
      // @ts-ignore
      return this.groups[top].tabs;
    },
    getActiveFor(top: TabType) {
      // @ts-ignore
      return this.groups[top].activeTabPath;
    },
  },
});
