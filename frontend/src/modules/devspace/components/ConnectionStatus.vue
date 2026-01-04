<template>
  <div class="connection-status" :class="statusClass">
    <i :class="statusIcon"></i>
    <span>{{ statusText }}</span>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import { devtelSocket } from '../services/devtel-socket';

export default {
  name: 'ConnectionStatus',
  setup() {
    const isConnected = ref(false);
    const isConnecting = ref(true);

    const statusClass = computed(() => {
      if (isConnected.value) return 'status-connected';
      if (isConnecting.value) return 'status-connecting';
      return 'status-disconnected';
    });

    const statusIcon = computed(() => {
      if (isConnected.value) return 'ri-wifi-line';
      if (isConnecting.value) return 'ri-loader-4-line rotating';
      return 'ri-wifi-off-line';
    });

    const statusText = computed(() => {
      if (isConnected.value) return 'Connected';
      if (isConnecting.value) return 'Connecting...';
      return 'Disconnected';
    });

    const handleConnect = () => {
      isConnected.value = true;
      isConnecting.value = false;
    };

    const handleDisconnect = () => {
      isConnected.value = false;
      isConnecting.value = false;
    };

    const handleReconnecting = () => {
      isConnected.value = false;
      isConnecting.value = true;
    };

    onMounted(() => {
      // Check initial connection state
      if (devtelSocket.socket?.connected) {
        isConnected.value = true;
        isConnecting.value = false;
      }

      // Listen to connection events
      devtelSocket.on('connect', handleConnect);
      devtelSocket.on('disconnect', handleDisconnect);
      devtelSocket.on('reconnecting', handleReconnecting);
    });

    onUnmounted(() => {
      devtelSocket.off('connect', handleConnect);
      devtelSocket.off('disconnect', handleDisconnect);
      devtelSocket.off('reconnecting', handleReconnecting);
    });

    return {
      statusClass,
      statusIcon,
      statusText,
    };
  },
};
</script>

<script setup>
import { computed } from 'vue';
</script>

<style scoped>
.connection-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.status-connected {
  background: rgba(103, 194, 58, 0.1);
  color: #67c23a;
}

.status-connecting {
  background: rgba(230, 162, 60, 0.1);
  color: #e6a23c;
}

.status-disconnected {
  background: rgba(245, 108, 108, 0.1);
  color: #f56c6c;
}

.connection-status i {
  font-size: 14px;
}

.rotating {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
