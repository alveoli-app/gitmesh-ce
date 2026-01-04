<template>
  <div class="empty-state">
    <div class="empty-state-icon">
      <i :class="icon"></i>
    </div>
    <h3>{{ title }}</h3>
    <p class="empty-state-description">{{ description }}</p>
    <el-button 
      v-if="actionText" 
      type="primary" 
      @click="$emit('action')"
      :icon="actionIcon"
    >
      {{ actionText }}
    </el-button>
    <slot name="extra"></slot>
  </div>
</template>

<script setup>
defineProps({
  icon: {
    type: String,
    default: 'ri-inbox-line'
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  actionText: {
    type: String,
    default: ''
  },
  actionIcon: {
    type: String,
    default: 'ri-add-line'
  }
})

defineEmits(['action'])
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 80px 20px;
  min-height: 400px;
}

.empty-state-icon {
  font-size: 72px;
  color: var(--el-text-color-placeholder);
  margin-bottom: 24px;
  opacity: 0.6;
}

.empty-state h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 12px 0;
}

.empty-state-description {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin: 0 0 32px 0;
  max-width: 480px;
  line-height: 1.6;
}

.empty-state .el-button {
  min-width: 140px;
}

/* Animation */
.empty-state-icon i {
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}
</style>
