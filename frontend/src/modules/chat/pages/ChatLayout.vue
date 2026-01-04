<template>
  <div class="chat-layout">
    <router-view />
  </div>
</template>

<script>
import { onMounted } from 'vue'
import { useStore } from 'vuex'

export default {
  name: 'ChatLayout',
  setup() {
    const store = useStore()

    onMounted(async () => {
      // Fetch data in parallel, handling each independently to prevent cascading failures
      // when some API endpoints are unavailable
      const fetchPromises = [
        store.dispatch('chat/chat/fetchConversations').catch(err => {
          console.warn('Chat conversations unavailable:', err.message)
        }),
        store.dispatch('chat/chat/fetchPendingActionsCount').catch(err => {
          console.warn('Pending actions count unavailable:', err.message)
        }),
        store.dispatch('chat/chat/fetchActiveInsightsCount').catch(err => {
          console.warn('Insights count unavailable:', err.message)
        })
      ]
      await Promise.all(fetchPromises)
    })

    return {}
  }
}
</script>

<style lang="scss" scoped>
.chat-layout {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #09090b;
}
</style>
