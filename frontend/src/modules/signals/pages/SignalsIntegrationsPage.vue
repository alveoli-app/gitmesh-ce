<template>
  <div class="signals-integrations-page bg-black min-h-screen">
    <app-page-wrapper size="full-width" class="!bg-black">
      <div class="integrations-page !bg-black min-h-screen">
        <!-- Header -->
        <div class="mb-10">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-white mb-2">Signals - Integrations</h1>
              <p class="text-zinc-400">Manage your integrations and data sources for signals</p>
            </div>
            <div>
              <el-button
                class="btn btn--primary btn--md"
                @click="addIntegration"
              >
                <i class="ri-add-line mr-2"></i>
                Add Integration
              </el-button>
            </div>
          </div>
        </div>

        <!-- Integrations Content -->
        <div class="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div v-if="hasIntegrations" class="space-y-4">
            <div
              v-for="integration in activeIntegrations"
              :key="integration.platform"
              class="bg-zinc-800 rounded-lg p-4 flex items-center justify-between"
            >
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-zinc-700 rounded-lg flex items-center justify-center">
                  <i class="ri-link-line text-zinc-300"></i>
                </div>
                <div>
                  <h4 class="text-zinc-100 font-medium">{{ integration.label }}</h4>
                  <p class="text-zinc-400 text-sm">Connected</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                <span class="text-zinc-400 text-sm">Active</span>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-12">
            <div class="w-16 h-16 bg-zinc-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <i class="ri-plug-line text-3xl text-zinc-200"></i>
            </div>
            <h3 class="text-zinc-100 font-medium text-lg mb-2">No Integrations</h3>
            <p class="text-zinc-400 text-sm mb-6">
              Connect your tools and platforms to start receiving signals data.
            </p>
            <el-button
              class="btn btn--md btn--primary"
              @click="addIntegration"
            >
              Add Your First Integration
            </el-button>
          </div>
        </div>
      </div>
    </app-page-wrapper>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
import AppPageWrapper from '@/shared/layout/page-wrapper.vue';

const store = useStore();

const activeIntegrations = computed(() => {
  const activeIntegrationList = store.getters['integration/activeList'] || {};
  return Object.keys(activeIntegrationList).map((i) => ({
    ...activeIntegrationList[i],
    platform: i,
    label: i.charAt(0).toUpperCase() + i.slice(1),
  }));
});

const hasIntegrations = computed(() => activeIntegrations.value.length > 0);

const addIntegration = () => {
  // Navigate to integrations setup or open modal
  console.log('Add integration functionality will be implemented here');
};
</script>

<style scoped>
.signals-integrations-page {
  /* Community edition signals integrations page styles */
}
</style>