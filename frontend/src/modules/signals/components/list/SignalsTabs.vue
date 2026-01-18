<template>
  <div class="flex items-center gap-6">
    <!-- View Tabs -->
    <div class="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
      <button
        v-for="view of views"
        :key="view.id"
        class="flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200"
        :class="activeView.id === view.id ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'"
        @click="doChangeActiveView(view.id)"
      >
        <i :class="icons[view.id]" class="text-base"></i>
        <span>{{ view.label }}</span>
      </button>
    </div>

    <!-- Sort Dropdown -->
    <div class="h-6 w-px bg-zinc-800 mx-2"></div>

    <app-inline-select-input
      v-if="sorter"
      v-model="sorter"
      popper-class="sorter-popper-class"
      placement="bottom-end"
      :options="sorterOptions"
      class="text-sm"
      @change="doChangeSort"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
import {
  mapActions,
  mapGetters,
} from '@/shared/vuex/vuex.helpers';

const icons = {
  feed: 'ri-rss-line',
  bookmarked: 'ri-bookmark-line',
};

const store = useStore();
const { doChangeActiveView, doChangeSort } = mapActions('signals');
const { activeView } = mapGetters('signals');

const views = computed(() => Object.values(store.state.signals.views));

const sorter = computed({
  get() {
    return activeView.value?.sorter;
  },
  set() {},
});

const sorterOptions = computed(() => {
  if (activeView.value.id === 'bookmarked') {
    return [
      {
        value: 'individualBookmarks',
        label: 'My bookmarks',
      },
      {
        value: 'teamBookmarks',
        label: 'Team bookmarks',
        description: 'All posts bookmarked by your team',
      },
    ];
  }

  return [
    {
      value: 'relevant',
      label: 'Most relevant',
    },
    {
      value: 'recent',
      label: 'Most recent',
    },
  ];
});
</script>

<style lang="scss">
.sorter-popper-class {
  .el-select-dropdown__item {
    @apply text-zinc-300;
    &.selected {
      @apply text-orange-500 font-medium;
    }
    &:hover {
      @apply bg-zinc-800;
    }
  }
}
</style>