<template>
  <div class="signals-home-page bg-black min-h-screen">
    <div class="container mx-auto px-6 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">Signals Dashboard</h1>
        <p class="text-zinc-400">Monitor and analyze your development signals</p>
      </div>

      <!-- Main Content -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <!-- Left Column - Settings and Filters -->
        <div class="lg:col-span-1">
          <signals-settings />
        </div>

        <!-- Right Column - Signals Feed -->
        <div class="lg:col-span-3">
          <div class="bg-zinc-900 rounded-xl border border-zinc-800">
            <!-- Tabs and Controls -->
            <div class="p-6 border-b border-zinc-800">
              <signals-tabs />
            </div>

            <!-- Signals List -->
            <div class="min-h-[600px]">
              <signals-list :list="list" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
import SignalsSettings from '@/modules/signals/components/list/SignalsSettings.vue';
import SignalsList from '@/modules/signals/components/list/SignalsList.vue';
import SignalsTabs from '@/modules/signals/components/list/SignalsTabs.vue';
import { mapGetters } from '@/shared/vuex/vuex.helpers';

const store = useStore();
const { activeView } = mapGetters('signals');

const list = computed(() => {
  if (!activeView.value) return [];
  return store.state.signals.views[activeView.value.id]?.list?.rows || [];
});
</script>

<style scoped>
.signals-home-page {
  /* Community edition signals home page styles */
}
</style>