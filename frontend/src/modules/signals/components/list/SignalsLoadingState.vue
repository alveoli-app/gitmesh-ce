<template>
  <div class="flex flex-col items-center justify-center py-20">
    <div class="grid grid-cols-1 gap-4 w-full max-w-4xl px-6">
      <signals-loading-card
        v-for="i in 3"
        :key="i"
        size="large"
      />
    </div>
    
    <div class="mt-8 text-center">
      <div class="inline-flex items-center gap-2 text-zinc-400 text-sm">
        <div class="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
        <span>Loading your signals feed...</span>
      </div>
      <div
        v-if="showLongerLoading && showDescription"
        class="text-zinc-200 text-xs mt-2"
      >
        This might take a few seconds as we gather fresh content.
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  onMounted,
  onUnmounted,
  ref,
  defineProps,
} from 'vue';
import SignalsLoadingCard from './SignalsLoadingCard.vue';

const showLongerLoading = ref(false);
const timeout = ref();

const props = defineProps({
  showDescription: {
    type: Boolean,
    default: true,
  },
});

onMounted(() => {
  if (props.showDescription) {
    timeout.value = setTimeout(() => {
      showLongerLoading.value = true;
    }, 2000);
  }
});

onUnmounted(() => {
  if (props.showDescription) {
    clearTimeout(timeout.value);
  }
});
</script>