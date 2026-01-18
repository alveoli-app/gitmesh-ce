<template>
  <div class="flex flex-col h-screen bg-black overflow-hidden">
    <!-- Top Bar (Fixed Position) -->
    <tab-bar />

    <!-- Main Content Area with top padding to account for fixed tab bar -->
    <el-container class="flex-1 overflow-hidden bg-black relative pt-[56px]">
      <!-- Mobile Overlay -->
      <div 
        v-if="isMobile && !collapsed" 
        class="absolute inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity"
        @click="collapseMenu"
      />

      <app-menu :class="{ 'absolute z-50 h-full shadow-2xl': isMobile, 'hidden': isMobile && collapsed }" />
      <el-container v-if="currentTenant" class="bg-black is-vertical flex-col overflow-hidden w-full">
        <el-main id="main-page-wrapper" class="relative bg-black !pt-0 h-full overflow-auto">
          <div class="bg-black">

          <banner
            v-if="showIntegrationsNeedReconnectAlert"
            variant="alert"
          >
            <div
              class="flex items-center justify-center grow text-sm font-mono"
            >
              {{ integrationsNeedReconnectToString }} integration
              need{{ integrationsInProgress.length > 1 ? '' : 's' }} to be reconnected due to a change in their API.
              Please reconnect {{ integrationsInProgress.length > 1 ? 'them' : 'it' }} to continue receiving data.
              <router-link
                :to="{ name: 'integration' }"
                class="btn btn--sm bg-orange-500 hover:bg-orange-600 border-orange-500 text-black font-bold ml-4"
              >
                Go to Integrations
              </router-link>
            </div>
          </banner>
          <banner
            v-if="showOrganizationsAlertBanner"
            variant="alert"
          >
            <div
              class="flex items-center justify-center grow text-sm font-mono"
            >
              We're currently experiencing several issues with Organizations and are sorry for the inconvenience.
              You can expect major improvements by Tuesday, Aug 15th. 🚧
            </div>
          </banner>
        </div>
        <router-view v-slot="{ Component }">
          <component :is="Component" :key="route.fullPath" />
        </router-view>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script lang="ts">
import { mapActions, mapGetters } from 'vuex';
import AppMenu from '@/modules/layout/components/menu.vue';
import TabBar from '@/modules/layout/components/tab-bar.vue';
import { onMounted, onUnmounted, watch } from 'vue';
import { useTopNavStore } from '@/modules/layout/store/topNav';
import { signalsMainMenu, chatMenu, devspaceMenu } from '@/modules/layout/config/menu';
import { useRoute, useRouter } from 'vue-router';

export default {
  name: 'AppLayout',

  components: {
    AppMenu,
    TabBar,
    // local banner component
    Banner: () => import('@/shared/banner/banner.vue'),
  },

  setup() {
    const route = useRoute();
    const router = useRouter();
    const topNav = useTopNavStore();
    topNav.init();

    // Initialize top selection based on current route
    // Robustly check by route name and resolved paths to avoid misclassification on refresh
    const findGroupForRoute = (r: any) => {
      const name = r.name;
      const fullPath = r.fullPath || '';

      const matches = (menu: any[]) => {
        return menu.some((m: any) => {
          if (!m) return false;
          if (m.routeName && name && m.routeName === name) return true;
          if (m.path && fullPath && fullPath.startsWith(m.path)) return true;
          if (m.routeName) {
            try {
              const resolved = router.resolve({ name: m.routeName });
              if (resolved && resolved.href && fullPath.startsWith(resolved.href)) return true;
            } catch (e) {
              // ignore resolution errors
            }
          }
          return false;
        });
      };

      if (matches(chatMenu)) return 'chat';
      if (matches(devspaceMenu)) return 'devspace';
      return 'signals';
    };

    // Set initial top to match route (so sidebar and content align on refresh)
    onMounted(() => {
      const group = findGroupForRoute(route);
      topNav.set(group as any);
    });

    // Persist last visited for the active top when route changes
    watch(
      () => route.fullPath,
      (p) => {
        const selected = topNav.selected as 'signals' | 'chat' | 'devspace';
        if (selected) topNav.setLastVisited(selected, p || '/');
      },
      { immediate: true },
    );

    return { route, topNav };
  },

  data() {
    return {
      fetchIntegrationTimer: null,
      loading: false,
    };
  },

  computed: {
    ...mapGetters({
      collapsed: 'layout/menuCollapsed',
      isMobile: 'layout/isMobile',
      currentUser: 'auth/currentUser',
      currentTenant: 'auth/currentTenant',
      integrationsInProgress: 'integration/inProgress',
      integrationsNeedReconnect: 'integration/needsReconnect',
      showIntegrationsNeedReconnectAlert: 'tenant/showIntegrationsNeedReconnectAlert',
      showOrganizationsAlertBanner: 'tenant/showOrganizationsAlertBanner',
    }),

    integrationsInProgressToString() {
      const arr = (this.integrationsInProgress || []).map((i) => i.name);
      if (arr.length === 1) return arr[0];
      if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
      return `${arr.slice(0, arr.length - 1).join(', ')}, and ${arr.slice(-1)}`;
    },

    integrationsNeedReconnectToString() {
      const arr = (this.integrationsNeedReconnect || []).map((i) => i.name);
      if (arr.length === 1) return arr[0];
      if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
      return `${arr.slice(0, arr.length - 1).join(', ')}, and ${arr.slice(-1)}`;
    },

    // No cached views: keep-alive removed to prevent background tab pages
  },

  created() {
    if (this.isMobile) {
      this.collapseMenu();
    }
    this.fetchIntegrationTimer = setInterval(async () => {
      if (this.integrationsInProgress.length === 0) clearInterval(this.fetchIntegrationTimer);
    }, 30000);
  },

  async mounted() {
    this.initPendo();
  },

  unmounted() {
    clearInterval(this.fetchIntegrationTimer);
  },

  methods: {
    ...mapActions({
      collapseMenu: 'layout/collapseMenu',
    }),
    initPendo() {
      // This function creates anonymous visitor IDs in Pendo unless you change the visitor id field to use your app's values
      // This function uses the placeholder 'ACCOUNT-UNIQUE-ID' value for account ID unless you change the account id field to use your app's values
      // Call this function in your authentication promise handler or callback when your visitor and account id values are available
      // Please use Strings, Numbers, or Bools for value types.
      if (window.pendo) {
        window.pendo.initialize({
          visitor: {
            id: this.currentUser.id, // Required if user is logged in, default creates anonymous ID
            email: this.currentUser.email, // Recommended if using Pendo Feedback, or NPS Email
            full_name: this.currentUser.fullName, // Recommended if using Pendo Feedback
            // role:         // Optional

            // You can add any additional visitor level key-values here,
            // as long as it's not one of the above reserved names.
          },

          account: {
            id: this.currentTenant?.id, // Required if using Pendo Feedback, default uses the value 'ACCOUNT-UNIQUE-ID'
            name: this.currentTenant?.name, // Optional
            is_paying: this.current
            // monthly_value:// Recommended if using Pendo Feedback
            // planLevel:    // Optional
            // planPrice:    // Optional
            // creationDate: // Optional

            // You can add any additional account level key-values here,
            // as long as it's not one of the above reserved names.
          },
        });
      }
    },
  },
};
</script>

<style lang="scss">
// Global override for Element Plus drawers and dialogs
// This ensures they respect the top bar height and don't overlap it
.el-overlay {
  top: 56px !important; // Height of the tab bar
  height: calc(100% - 56px) !important;
}
</style>
