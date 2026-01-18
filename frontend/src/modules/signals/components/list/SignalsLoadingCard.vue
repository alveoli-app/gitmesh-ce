<template>
  <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
    <div class="flex items-center gap-3 mb-6">
      <div class="w-8 h-8 rounded-lg bg-zinc-800 animate-pulse"></div>
      <div class="flex flex-col gap-2">
        <div class="h-3 w-20 bg-zinc-800 rounded animate-pulse"></div>
        <div class="h-2 w-12 bg-zinc-800 rounded animate-pulse"></div>
      </div>
    </div>

    <div class="mb-4 flex flex-col gap-2">
      <div
        v-for="(_, index) in Array(tiles.title)"
        :key="index"
        class="bg-zinc-800 h-4 w-10/12 last:w-9/12 rounded animate-pulse"
      />
    </div>
    <div class="flex flex-col gap-2">
      <div
        v-for="(_, index) in Array(tiles.description)"
        :key="index"
        class="bg-zinc-800/50 h-3 w-full last:w-11/12 rounded animate-pulse"
      />
    </div>
  </div>
</template>
<script setup>
import { computed, defineProps } from 'vue';

const props = defineProps({
  size: {
    type: String,
    default: 'small',
  },
});
const tiles = computed(() => {
  if (props.size === 'small') {
    return { title: 2, description: 3 };
  }
  return { title: 3, description: 4 };
});
</script>