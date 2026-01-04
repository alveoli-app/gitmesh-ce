<template>
  <div v-if="hasError" class="error-boundary">
    <div class="error-content">
      <div class="error-icon">
        <i class="ri-error-warning-line"></i>
      </div>
      <h3>{{ errorTitle }}</h3>
      <p>{{ errorMessage }}</p>
      <div class="error-actions">
        <el-button type="primary" @click="retry">
          <i class="ri-refresh-line"></i>
          Try Again
        </el-button>
        <el-button @click="goHome">
          <i class="ri-home-line"></i>
          Go to Overview
        </el-button>
      </div>
      <details v-if="isDev && errorStack" class="error-details">
        <summary>Error Details (Development Only)</summary>
        <pre>{{ errorStack }}</pre>
      </details>
    </div>
  </div>
  <slot v-else></slot>
</template>

<script setup>
import { ref, onErrorCaptured, computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  fallbackTitle: {
    type: String,
    default: 'Something went wrong'
  },
  fallbackMessage: {
    type: String,
    default: 'An unexpected error occurred. Please try again or contact support if the problem persists.'
  }
})

const router = useRouter()
const hasError = ref(false)
const errorMessage = ref('')
const errorTitle = ref('')
const errorStack = ref('')

const isDev = computed(() => {
  return process.env.NODE_ENV === 'development'
})

// Capture errors from child components
onErrorCaptured((err, instance, info) => {
  hasError.value = true
  errorTitle.value = props.fallbackTitle
  errorMessage.value = err.message || props.fallbackMessage
  errorStack.value = err.stack || ''

  // Log error for debugging
  console.error('Component Error Boundary:', {
    error: err,
    component: instance?.$options?.name || 'Unknown',
    info,
    stack: err.stack
  })

  // Prevent error from propagating
  return false
})

const retry = () => {
  hasError.value = false
  errorMessage.value = ''
  errorTitle.value = ''
  errorStack.value = ''
  
  // Reload the page to reset state
  window.location.reload()
}

const goHome = () => {
  hasError.value = false
  router.push('/devspace/overview')
}
</script>

<style scoped>
.error-boundary {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 40px 20px;
  background: var(--el-bg-color);
}

.error-content {
  text-align: center;
  max-width: 500px;
}

.error-icon {
  font-size: 64px;
  color: var(--el-color-danger);
  margin-bottom: 24px;
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

.error-content h3 {
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 12px;
}

.error-content p {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin-bottom: 32px;
  line-height: 1.6;
}

.error-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.error-details {
  margin-top: 32px;
  text-align: left;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  padding: 12px;
}

.error-details summary {
  cursor: pointer;
  font-weight: 500;
  color: var(--el-text-color-regular);
  margin-bottom: 8px;
}

.error-details pre {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
