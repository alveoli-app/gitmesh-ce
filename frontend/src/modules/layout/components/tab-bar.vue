<template>
  <div class="fixed top-0 left-0 right-0 z-[3000] tabbar-bg h-[56px]">
    <div class="flex items-center h-full px-4">
      <!-- Top selector (replaces multi-tab bar) -->
      <div ref="tabsContainer" class="flex-1 flex items-center">
        <div class="top-tabs w-full flex items-center justify-between">
          <!-- Signals Tab - Available in Community Edition -->
          <el-button
            v-if="isTabAvailable('signals')"
            class="top-tab-btn"
            :class="{ active: selectedTop === 'signals' }"
            @click="setTop('signals')"
            size="small"
            data-testid="signals-tab"
          >
            Signals
          </el-button>

          <!-- Chat Tab - Only show in Enterprise Edition -->
          <el-button
            v-if="isTabAvailable('chat')"
            class="top-tab-btn"
            :class="{ active: selectedTop === 'chat' }"
            @click="setTop('chat')"
            size="small"
            data-testid="chat-tab"
          >
            Chat
          </el-button>

          <!-- DevSpace Tab - Available in all editions -->
          <el-button
            class="top-tab-btn"
            :class="{ active: selectedTop === 'devspace' }"
            @click="setTop('devspace')"
            size="small"
            data-testid="devspace-tab"
          >
            DevSpace
          </el-button>
        </div>
      </div>

      <!-- Fixed Right Section -->
      <div class="flex items-center shrink-0 status-area">
        <!-- Page Status Badge -->
        <div v-if="badge && badge !== 'NONE'" class="px-3 flex items-center">
          <el-tooltip
            :content="`Status: ${badge}`"
            placement="bottom"
            effect="dark"
          >
              <span 
                class="px-3 py-1 rounded text-[11px] font-mono font-medium tracking-wider uppercase border cursor-help neutral-badge"
              >
                {{ badge }}
              </span>
          </el-tooltip>
        </div>

        <!-- Notifications Icon -->
        <div class="px-3 flex items-center relative">
          <el-popover
            placement="bottom-end"
            :width="400"
            trigger="click"
            popper-class="notifications-popover"
          >
            <template #reference>
              <div class="relative cursor-pointer p-2 hover:bg-zinc-800 rounded transition-colors">
                <i class="ri-notification-3-line text-lg text-zinc-400 hover:text-white" />
                <span
                  v-if="hasNotifications"
                  class="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"
                />
              </div>
            </template>
            <div class="max-h-[400px] overflow-y-auto">
              <!-- Sample Data Alert -->
              <div
                v-if="showSampleDataAlert"
                class="p-3 mb-2 bg-orange-500/10 border border-orange-500/20 rounded text-sm"
              >
                <div class="flex items-start">
                  <i class="ri-alert-line text-orange-500 mr-2 mt-0.5" />
                  <div class="flex-1">
                    <div class="text-zinc-200 mb-2">
                      This workspace is using sample data. Connect your first integration to start fetching real data.
                    </div>
                    <router-link :to="{ name: 'integration' }">
                      <el-button size="small" class="bg-orange-500 hover:bg-orange-600 border-orange-500 text-black">
                        Connect integration
                      </el-button>
                    </router-link>
                  </div>
                </div>
              </div>

              <!-- Integrations Error Alert -->
              <div
                v-if="showIntegrationsErrorAlert"
                class="p-3 mb-2 bg-orange-500/10 border border-orange-500/20 rounded text-sm"
              >
                <div class="flex items-start">
                  <i class="ri-alert-line text-orange-500 mr-2 mt-0.5" />
                  <div class="flex-1">
                    <div class="text-zinc-200 mb-2">
                      Currently you have integrations with connectivity issues.
                    </div>
                    <router-link :to="{ name: 'integration' }">
                      <el-button size="small" class="bg-orange-500 hover:bg-orange-600 border-orange-500 text-black">
                        Go to Integrations
                      </el-button>
                    </router-link>
                  </div>
                </div>
              </div>

              <!-- Integrations No Data Alert -->
              <div
                v-if="showIntegrationsNoDataAlert"
                class="p-3 mb-2 bg-orange-500/10 border border-orange-500/20 rounded text-sm"
              >
                <div class="flex items-start">
                  <i class="ri-alert-line text-orange-500 mr-2 mt-0.5" />
                  <div class="flex-1">
                    <div class="text-zinc-200 mb-2">
                      Currently you have integrations that are not receiving activities.
                    </div>
                    <router-link :to="{ name: 'integration' }">
                      <el-button size="small" class="bg-orange-500 hover:bg-orange-600 border-orange-500 text-black">
                        Go to Integrations
                      </el-button>
                    </router-link>
                  </div>
                </div>
              </div>

              <!-- Integrations In Progress Alert -->
              <div
                v-if="showIntegrationsInProgressAlert"
                class="p-3 mb-2 bg-blue-500/10 border border-blue-500/20 rounded text-sm"
              >
                <div class="flex items-start">
                  <div class="w-4 h-4 mr-2 mt-0.5">
                    <i class="ri-loader-4-line text-blue-500 animate-spin" />
                  </div>
                  <div class="flex-1 text-zinc-200">
                    <span class="font-semibold">{{ integrationsInProgressToString }}</span>
                    {{ integrationsInProgress.length > 1 ? 'integrations are' : 'integration is' }}
                    getting set up. Sit back and relax. We will send you an email when it's done.
                  </div>
                </div>
              </div>

              <!-- Integrations Need Reconnect Alert -->
              <div
                v-if="showIntegrationsNeedReconnectAlert"
                class="p-3 mb-2 bg-orange-500/10 border border-orange-500/20 rounded text-sm"
              >
                <div class="flex items-start">
                  <i class="ri-alert-line text-orange-500 mr-2 mt-0.5" />
                  <div class="flex-1">
                    <div class="text-zinc-200 mb-2">
                      {{ integrationsNeedReconnectToString }} integration
                      need{{ integrationsNeedReconnect.length > 1 ? '' : 's' }} to be reconnected due to a change in their API.
                    </div>
                    <router-link :to="{ name: 'integration' }">
                      <el-button size="small" class="bg-orange-500 hover:bg-orange-600 border-orange-500 text-black">
                        Go to Integrations
                      </el-button>
                    </router-link>
                  </div>
                </div>
              </div>

              <!-- Organizations Alert -->
              <div
                v-if="showOrganizationsAlertBanner"
                class="p-3 mb-2 bg-orange-500/10 border border-orange-500/20 rounded text-sm"
              >
                <div class="flex items-start">
                  <i class="ri-alert-line text-orange-500 mr-2 mt-0.5" />
                  <div class="flex-1 text-zinc-200">
                    We're currently experiencing several issues with Organizations and are sorry for the inconvenience.
                    You can expect major improvements by Tuesday, Aug 15th. 🚧
                  </div>
                </div>
              </div>

              <!-- Insights Alert -->
              <div
                v-if="activeInsightsCount > 0 && isChatEnabled"
                class="p-3 mb-2 bg-purple-500/10 border border-purple-500/20 rounded text-sm"
              >
                <div class="flex items-start">
                  <i class="ri-lightbulb-line text-purple-500 mr-2 mt-0.5" />
                  <div class="flex-1">
                    <div class="text-zinc-200 mb-2">
                      You have <b>{{ activeInsightsCount }}</b> active AI insights waiting for your review.
                    </div>
                    <el-button 
                      size="small" 
                      class="bg-purple-500 hover:bg-purple-600 border-purple-500 text-white"
                      @click="router.push({ name: 'chat-insights' })"
                    >
                      View Insights
                    </el-button>
                  </div>
                </div>
              </div>

              <!-- No Notifications -->
              <div
                v-if="!hasNotifications"
                class="p-4 text-center text-zinc-500 text-sm"
              >
                <i class="ri-notification-off-line text-2xl mb-2" />
                <div>No notifications</div>
              </div>
            </div>
          </el-popover>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, computed, onMounted, nextTick, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTopNavStore } from '@/modules/layout/store/topNav';
import { useTabsStore } from '@/modules/layout/store/tabs';
import { FeatureFlag } from '@/utils/featureFlag';
import { signalsMainMenu, chatMenu, devspaceMenu } from '@/modules/layout/config/menu';
import { useStore } from 'vuex';
import config from '@/config';
// import pageStatus from '@/config/page-status.json';
const pageStatus: Record<string, string> = {
  "dashboard": "NONE",
  "member": "NONE", 
  "organization": "NONE",
  "activity": "NONE",
  "report": "BETA",
  "signals": "BETA",
  "chat": "COMING SOON",
  "automations": "COMING SOON",
  "integration": "NONE"
};

const route = useRoute();
const router = useRouter();
const topNav = useTopNavStore();
const tabsStore = useTabsStore();
topNav.init();
const store = useStore();

const tabsContainer = ref(null);

const isChatEnabled = computed(() => {
  // Chat is only available in Enterprise Edition (premium)
  if ((config as any).isCommunityVersion) {
    return false;
  }
  return FeatureFlag.isFlagEnabled(FeatureFlag.flags.agenticChat);
});

// Edition-based tab visibility with improved logic
const availableTabs = computed(() => topNav.availableTabs);

const isTabAvailable = (tab: string) => {
  // Use topNav store for consistent tab availability logic
  const available = topNav.isTabAvailable(tab as any);
  
  // Additional edition-based checks for specific tabs
  if (tab === 'chat') {
    // Chat is premium-only, not available in Community Edition
    return !(config as any).isCommunityVersion && available;
  }
  
  if (tab === 'signals') {
    // Signals is available in both editions, but with different features
    return available;
  }
  
  if (tab === 'devspace') {
    // DevSpace is available in all editions
    return available;
  }
  
  return available;
};

const isDevMode = (import.meta as any).env?.DEV;
const badge = computed(() => {
  // Check if the current route name exists in the page status config
  if (route.name && pageStatus[route.name as keyof typeof pageStatus]) {
    return pageStatus[route.name as keyof typeof pageStatus];
  }
  // Fallback to route meta badge if not in config
  return route.meta?.badge;
});

// Check if container needs minor update on mount
onMounted(() => {
  if (isChatEnabled.value) {
    store.dispatch('chat/chat/fetchActiveInsightsCount');
  }
  
  nextTick(() => {
    if (tabsContainer.value) {
      // keep placeholder for styling decisions
    }
  });
});

// Notification-related computed properties
const integrationsInProgress = computed(() => store.getters['integration/inProgress']);
const integrationsNeedReconnect = computed(() => store.getters['integration/needsReconnect']);
const showSampleDataAlert = computed(() => store.getters['tenant/showSampleDataAlert']);
const showIntegrationsErrorAlert = computed(() => store.getters['tenant/showIntegrationsErrorAlert']);
const showIntegrationsNoDataAlert = computed(() => store.getters['tenant/showIntegrationsNoDataAlert']);
const showIntegrationsInProgressAlert = computed(() => store.getters['tenant/showIntegrationsInProgressAlert']);
const showIntegrationsNeedReconnectAlert = computed(() => store.getters['tenant/showIntegrationsNeedReconnectAlert']);
const showOrganizationsAlertBanner = computed(() => store.getters['tenant/showOrganizationsAlertBanner']);

const activeInsightsCount = computed(() => store.state.chat?.chat?.activeInsightsCount || 0);

const hasNotifications = computed(() => {
  return activeInsightsCount.value > 0 ||
         showSampleDataAlert.value || 
         showIntegrationsErrorAlert.value || 
         showIntegrationsNoDataAlert.value || 
         showIntegrationsInProgressAlert.value || 
         showIntegrationsNeedReconnectAlert.value || 
         showOrganizationsAlertBanner.value;
});

const integrationsInProgressToString = computed(() => {
  const arr = integrationsInProgress.value.map((i: any) => i.name);
  if (arr.length === 1) {
    return arr[0];
  } else if (arr.length === 2) {
    return `${arr[0]} and ${arr[1]}`;
  }
  return `${arr.slice(0, arr.length - 1).join(', ')}, and ${arr.slice(-1)}`;
});

const integrationsNeedReconnectToString = computed(() => {
  const arr = integrationsNeedReconnect.value.map((i: any) => i.name);
  if (arr.length === 1) {
    return arr[0];
  } else if (arr.length === 2) {
    return `${arr[0]} and ${arr[1]}`;
  }
  return `${arr.slice(0, arr.length - 1).join(', ')}, and ${arr.slice(-1)}`;
});

const selectedTop = computed(() => topNav.selected);

const setTop = (value: 'signals' | 'chat' | 'devspace') => {
  // Check if tab is available in current edition
  if (!isTabAvailable(value)) {
    // For Community Edition users trying to access premium features, redirect to paywall
    if ((config as any).isCommunityVersion && value === 'chat') {
      console.log(`Community Edition user attempted to access premium tab: ${value}`);
      
      // Navigate to paywall page - redirect to settings with upgrade prompt
      router.push({
        name: 'settings',
        query: { activeTab: 'plans', feature: value }
      }).catch(() => {
        // Fallback: redirect to devspace if settings route fails
        router.push({ name: 'devspace-overview' }).catch(() => {});
      });
      return;
    }
    
    console.warn(`Tab '${value}' is not available in current edition. Available tabs:`, availableTabs.value);
    return;
  }
  
  topNav.set(value);
};

// When top changes, navigate to last opened for that group or default first menu item
watch(() => topNav.selected, (newVal) => {
  // Prefer lastVisited stored in topNav
  const last = topNav.lastVisited?.[newVal];
  if (last) {
    router.push(last).catch(() => {});
    return;
  }

  // Fallback to first menu link based on tab selection
  let menu = signalsMainMenu;
  if (newVal === 'chat') {
    menu = chatMenu;
  } else if (newVal === 'devspace') {
    menu = devspaceMenu;
  }
  
  // For signals tab, ensure we navigate to community edition routes
  if (newVal === 'signals') {
    // Navigate to signals dashboard in community edition
    router.push({ name: 'signals-dashboard' }).catch(() => {
      // Fallback to signals root if dashboard route doesn't exist
      router.push('/signals').catch(() => {});
    });
    return;
  }
  
  // For other tabs, use the first available menu item
  const first = menu.find((m: any) => m && (m.routeName || m.path));
  if (first) {
    if (first.routeName) {
      router.push({ name: first.routeName }).catch(() => {});
    } else if (first.path) {
      router.push(first.path).catch(() => {});
    }
  }
}, { immediate: false });
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Smooth scrolling for tabs */
.no-scrollbar {
  scroll-behavior: smooth;
}

/* Add subtle shadow to indicate scrollable content */
.no-scrollbar::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 20px;
  height: 100%;
  background: linear-gradient(to left, rgba(0, 0, 0, 0.8), transparent);
  pointer-events: none;
  z-index: 1;
}

/* Hide shadow when not needed */
.no-scrollbar:not(.scrollable)::before {
  display: none;
}

/* Top tabs glassy styling */
.tabbar-bg {
  backdrop-filter: blur(8px);
  background: linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.45));
  border-bottom: 1px solid rgba(255,255,255,0.12); /* stronger separator */
  box-shadow: 0 2px 6px rgba(0,0,0,0.6); /* subtle drop shadow for separation */
}

.top-tabs {
  display: flex;
  gap: 8px;
  width: 100%;
}

.top-tab-btn {
  flex: 1 1 0;
  min-width: 0;
  height: 40px;
  background: rgba(255,255,255,0.02) !important;
  color: rgba(255,255,255,0.92) !important;
  border: 1px solid rgba(255,255,255,0.04) !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: 600;
  padding: 0 12px !important;
}

/* Adjust flex basis for Community Edition (single tab) */
.top-tabs:has(.top-tab-btn:only-child) .top-tab-btn {
  flex: 0 0 auto;
  min-width: 120px;
  max-width: 200px;
}

/* Adjust flex basis for Enterprise Edition (multiple tabs) */
.top-tabs:has(.top-tab-btn:not(:only-child)) .top-tab-btn {
  flex: 1 1 0;
  min-width: 0;
}

.top-tab-btn:hover {
  background: rgba(255,255,255,0.04) !important;
}

.top-tab-btn.active {
  background: rgba(255,255,255,0.06) !important; /* slightly greyish */
  color: rgba(255,255,255,0.92) !important;
  border-color: rgba(255,255,255,0.06) !important;
}

.neutral-badge {
  background: rgba(255,255,255,0.04) !important;
  color: rgba(255,255,255,0.9) !important;
  border: 1px solid rgba(255,255,255,0.06) !important;
}

.status-area {
  margin-left: 12px;
  width: 220px; /* fixed space for status area to avoid layout jumps */
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

/* Make the right-section contents stable */
.status-area .px-3 {
  padding-left: 8px !important;
  padding-right: 8px !important;
}
</style>

<style>
.notifications-popover {
  background-color: #18181b !important;
  border: 1px solid #3f3f46 !important;
  padding: 0 !important;
}

.notifications-popover .el-popper__arrow::before {
  background-color: #18181b !important;
  border: 1px solid #3f3f46 !important;
}
</style>
