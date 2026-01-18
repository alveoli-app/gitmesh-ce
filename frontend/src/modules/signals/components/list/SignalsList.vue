<template>
  <div class="h-full flex flex-col">
    <!-- Loading State -->
    <div
      v-if="loading && list.length === 0"
      class="flex-1 flex items-center justify-center"
    >
      <div class="text-center">
        <div class="inline-block w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <div class="text-zinc-400 text-sm">Loading signals...</div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="list.length === 0"
      class="flex-1 flex items-center justify-center"
    >
      <div class="text-center max-w-md mx-auto px-6">
        <div class="w-16 h-16 bg-zinc-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <i class="ri-search-2-line text-3xl text-zinc-200"></i>
        </div>
        <h3 class="text-zinc-100 font-medium text-lg mb-2">No signals found</h3>
        <p class="text-zinc-400 text-sm mb-6">
          We couldn't find any signals matching your current filters. Try adjusting your keywords or platform settings.
        </p>
        <el-button
          class="btn btn--md btn--primary"
          @click="openSettingsDrawer"
        >
          Adjust Filters
        </el-button>
      </div>
    </div>

    <!-- Results Grid -->
    <div
      v-else
      class="p-6"
    >
      <div class="grid grid-cols-1 gap-4 max-w-4xl mx-auto">
        <signals-result-card
          v-for="(item, index) in list"
          :key="item.url || index"
          :signal="item"
        />
      </div>

      <!-- Load More -->
      <div
        v-if="isLoadMoreVisible"
        class="flex justify-center mt-8 pb-8"
      >
        <el-button
          class="btn btn--md btn--secondary"
          :loading="loading"
          @click="onLoadMore"
        >
          Load More Signals
        </el-button>
      </div>
      
      <!-- Bottom of feed message -->
      <div v-if="showBottomFeedMessage && !loading && list.length > 0" class="text-center py-8 text-zinc-200 text-sm">
        <i class="ri-check-double-line mr-1"></i> You've reached the end of the feed
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, defineProps } from 'vue';
import { useStore } from 'vuex';
import SignalsResultCard from './SignalsResultCard.vue';

const props = defineProps({
  list: {
    type: Array,
    default: () => [],
  },
});

const store = useStore();
const activeView = computed(
  () => store.getters['signals/activeView'],
);
const loading = computed(
  () => store.state.signals.views[activeView.value.id].list
    .loading,
);
const count = computed(
  () => store.state.signals.views[activeView.value.id].count,
);
const pagination = computed(
  () => store.getters['signals/pagination'],
);

const isLoadMoreVisible = computed(() => {
  if (activeView.value.id === 'feed') {
    return false;
  }

  return (
    pagination.value.currentPage
      * pagination.value.pageSize
    < count.value
  );
});

const onLoadMore = () => {
  store.dispatch(
    'signals/doChangePaginationCurrentPage',
    pagination.value.currentPage + 1,
  );
};

const showBottomFeedMessage = computed(() => activeView.value.id === 'feed');

const openSettingsDrawer = () => {
  const event = new CustomEvent('open-signals-settings');
  window.dispatchEvent(event);
};
</script>