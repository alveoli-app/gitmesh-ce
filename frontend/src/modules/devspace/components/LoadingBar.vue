<template>
  <transition name="loading-bar-fade">
    <div v-if="isLoading" class="global-loading-bar">
      <div 
        class="loading-bar-progress" 
        :style="{ width: progress + '%' }"
      ></div>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isLoading = ref(false)
const progress = ref(0)
let progressInterval = null

// Start loading on route change
router.beforeEach((to, from, next) => {
  isLoading.value = true
  progress.value = 0
  
  // Simulate progress
  progressInterval = setInterval(() => {
    if (progress.value < 90) {
      progress.value += Math.random() * 15
    }
  }, 200)
  
  next()
})

// Complete loading after route change
router.afterEach(() => {
  if (progressInterval) {
    clearInterval(progressInterval)
  }
  
  progress.value = 100
  
  setTimeout(() => {
    isLoading.value = false
    progress.value = 0
  }, 400)
})

// Cleanup on unmount
import { onUnmounted } from 'vue'
onUnmounted(() => {
  if (progressInterval) {
    clearInterval(progressInterval)
  }
})
</script>

<style scoped>
.global-loading-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: 9999;
  background: transparent;
}

.loading-bar-progress {
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--el-color-primary) 0%,
    var(--el-color-primary-light-3) 100%
  );
  transition: width 0.2s ease;
  box-shadow: 0 0 10px var(--el-color-primary);
}

.loading-bar-fade-enter-active,
.loading-bar-fade-leave-active {
  transition: opacity 0.3s ease;
}

.loading-bar-fade-enter-from,
.loading-bar-fade-leave-to {
  opacity: 0;
}
</style>
