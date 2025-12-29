<template>
  <div class="fixed top-0 left-0 right-0 z-[3000] bg-black border-b border-zinc-800 h-[45px]">
    <div class="flex items-center h-full">
      <!-- Scrollable Tabs Container -->
      <div ref="tabsContainer" class="flex-1 overflow-x-auto no-scrollbar">
        <div class="flex items-center min-w-max">
          <div
            v-for="tab in tabs"
            :key="tab.id"
            :data-tab-id="tab.id"
            class="group flex items-center px-4 py-2.5 text-sm cursor-pointer border-r border-zinc-800 min-w-[140px] max-w-[240px] transition-all relative select-none h-[45px]"
            :class="{
              'bg-zinc-900 text-white': activeTabPath === tab.path,
              'text-zinc-200 hover:bg-zinc-900/50 hover:text-zinc-300': activeTabPath !== tab.path,
              'opacity-75': isSleeping(tab)
            }"
            @click="handleTabClick(tab)"
          >
            <div 
              v-if="activeTabPath === tab.path"
              class="absolute top-0 left-0 right-0 h-0.5 bg-brand-500"
            />
            
            <!-- Icon based on route name -->
            <i v-if="tab.name?.includes('member')" class="ri-user-line mr-2 text-xs" />
            <i v-else-if="tab.name?.includes('organization')" class="ri-building-line mr-2 text-xs" />
            <i v-else-if="tab.name?.includes('settings')" class="ri-settings-3-line mr-2 text-xs" />
            <i v-else class="ri-file-list-line mr-2 text-xs" />

            <span class="truncate mr-2 flex-1">{{ tab.title }}</span>
            
            <div
              class="opacity-0 group-hover:opacity-100 hover:bg-zinc-700 rounded p-0.5 transition-all text-zinc-400 hover:text-white flex items-center justify-center"
              @click.stop="handleTabClose(tab)"
            >
              <i class="ri-close-line text-xs" />
            </div>
          </div>
        </div>
      </div>

      <!-- Fixed Right Section -->
      <div class="flex items-center shrink-0 bg-black border-l border-zinc-800">
        <!-- Page Status Badge -->
        <div v-if="badge && badge !== 'NONE'" class="px-3 flex items-center">
          <el-tooltip
            :content="`Status: ${badge}`"
            placement="bottom"
            effect="dark"
          >
            <span 
              class="px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wider uppercase border cursor-help"
              :class="{
                'bg-purple-500/10 text-purple-400 border-purple-500/20': badge === 'BETA',
                'bg-blue-500/10 text-blue-400 border-blue-500/20': badge === 'COMING SOON',
                'bg-yellow-500/10 text-yellow-400 border-yellow-500/20': badge === 'ALPHA',
                'bg-green-500/10 text-green-400 border-green-500/20': badge === 'STABLE',
                'bg-zinc-800 text-zinc-400 border-zinc-700': !['BETA', 'COMING SOON', 'ALPHA', 'STABLE'].includes(badge)
              }"
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
import { useTabsStore } from '../store/tabs';
import { storeToRefs } from 'pinia';
import { useStore } from 'vuex';
import pageStatus from '@/config/page-status.json';

const route = useRoute();
const router = useRouter();
const tabsStore = useTabsStore();
const { tabs, activeTabPath } = storeToRefs(tabsStore);
const store = useStore();

const tabsContainer = ref(null);

const isDevMode = import.meta.env.DEV;
const badge = computed(() => {
  // Check if the current route name exists in the page status config
  if (route.name && pageStatus[route.name as keyof typeof pageStatus]) {
    return pageStatus[route.name as keyof typeof pageStatus];
  }
  // Fallback to route meta badge if not in config
  return route.meta?.badge;
});

// Check if tabs container needs scrolling
const checkScrollable = () => {
  nextTick(() => {
    if (tabsContainer.value) {
      const isScrollable = tabsContainer.value.scrollWidth > tabsContainer.value.clientWidth;
      if (isScrollable) {
        tabsContainer.value.classList.add('scrollable');
      } else {
        tabsContainer.value.classList.remove('scrollable');
      }
    }
  });
};

onMounted(() => {
  checkScrollable();
});

// Watch tabs changes to update scrollable state
watch(tabs, () => {
  checkScrollable();
}, { deep: true });

// Notification-related computed properties
const integrationsInProgress = computed(() => store.getters['integration/inProgress']);
const integrationsNeedReconnect = computed(() => store.getters['integration/needsReconnect']);
const showSampleDataAlert = computed(() => store.getters['tenant/showSampleDataAlert']);
const showIntegrationsErrorAlert = computed(() => store.getters['tenant/showIntegrationsErrorAlert']);
const showIntegrationsNoDataAlert = computed(() => store.getters['tenant/showIntegrationsNoDataAlert']);
const showIntegrationsInProgressAlert = computed(() => store.getters['tenant/showIntegrationsInProgressAlert']);
const showIntegrationsNeedReconnectAlert = computed(() => store.getters['tenant/showIntegrationsNeedReconnectAlert']);
const showOrganizationsAlertBanner = computed(() => store.getters['tenant/showOrganizationsAlertBanner']);

const hasNotifications = computed(() => {
  return showSampleDataAlert.value || 
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

// Watch route changes to add tabs
watch(
  () => route.fullPath,
  () => {
    if (route.name && route.name !== 'Login' && route.name !== 'Error') {
      tabsStore.addTab(route);
    }
  },
  { immediate: true }
);

// Watch active tab path to navigate and scroll into view
watch(activeTabPath, (newPath) => {
  if (newPath && newPath !== route.fullPath) {
    router.push(newPath);
  }
  // Find the active tab and scroll it into view
  const activeTab = tabs.value.find(tab => tab.path === newPath);
  if (activeTab) {
    scrollTabIntoView(activeTab);
  }
});

const handleTabClick = (tab: any) => {
  tabsStore.setActiveTab(tab.path);
  scrollTabIntoView(tab);
};

const scrollTabIntoView = (tab: any) => {
  nextTick(() => {
    const tabElement = document.querySelector(`[data-tab-id="${tab.id}"]`);
    if (tabElement && tabsContainer.value) {
      tabElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest', 
        inline: 'center' 
      });
    }
  });
};

const handleTabClose = (tab: any) => {
  tabsStore.removeTab(tab.path);
  // If we closed the last tab, navigate to home
  if (tabs.value.length === 0) {
    router.push('/');
  }
};

const isSleeping = (tab: any) => {
  const SLEEP_THRESHOLD = 15 * 60 * 1000; // 15 minutes
  return tab.path !== activeTabPath.value && (Date.now() - tab.lastAccessed) > SLEEP_THRESHOLD;
};
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
