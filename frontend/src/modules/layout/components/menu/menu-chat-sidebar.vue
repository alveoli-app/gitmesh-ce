<template>
  <div class="chat-sidebar-content">
    <!-- New Chat Button -->
    <div class="new-chat-btn">
      <el-button type="primary" size="small" class="w-full" @click="createNewConversation">
        <i class="ri-add-line mr-2"></i>
        New Chat
      </el-button>
    </div>

    <!-- Search Box -->
    <div class="search-box">
      <i class="ri-search-line search-icon"></i>
      <input 
        v-model="searchQuery" 
        type="text" 
        placeholder="Search conversations..."
        class="sidebar-search"
      />
    </div>

    <!-- Conversation List -->
    <div class="conversations-list">
      <template v-if="hasConversations">
        <div v-for="(group, label) in groupedConversations" :key="label" class="conv-group">
          <div class="group-label" v-if="group.length > 0">{{ label }}</div>
          <div 
            v-for="conv in group" 
            :key="conv.id"
            class="conversation-item"
            :class="{ active: activeConversationId === conv.id }"
            @click="openConversation(conv.id)"
          >
            <i class="ri-message-3-line"></i>
            <div class="conv-info">
              <span class="conv-title">{{ conv.title || 'New conversation' }}</span>
              <span class="conv-time">{{ formatTime(conv.lastMessageAt) }}</span>
            </div>
          </div>
        </div>
      </template>
      
      <div v-else-if="searchQuery" class="no-results">
        <p>No matches found</p>
      </div>
      
      <div v-else class="no-conversations">
        <i class="ri-chat-3-line"></i>
        <p>No conversations yet</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns'

const store = useStore()
const route = useRoute()
const router = useRouter()

const searchQuery = ref('')

const activeConversationId = computed(() => route.params.conversationId)
const recentConversations = computed(() => store.getters['chat/chat/recentConversations'] || [])

const filteredConversations = computed(() => {
  if (!searchQuery.value) return recentConversations.value
  const query = searchQuery.value.toLowerCase()
  return recentConversations.value.filter(c => 
    (c.title?.toLowerCase().includes(query)) ||
    (c.lastMessage?.content?.toLowerCase().includes(query))
  )
})

const groupedConversations = computed(() => {
  const groups = {
    'Today': [],
    'Yesterday': [],
    'Previous 7 Days': [],
    'Older': []
  }
  filteredConversations.value.forEach(conv => {
    const date = new Date(conv.lastMessageAt || conv.createdAt)
    if (isToday(date)) {
      groups['Today'].push(conv)
    } else if (isYesterday(date)) {
      groups['Yesterday'].push(conv)
    } else if (isThisWeek(date)) {
      groups['Previous 7 Days'].push(conv)
    } else {
      groups['Older'].push(conv)
    }
  })
  return groups
})

const hasConversations = computed(() => filteredConversations.value.length > 0)

const formatTime = (date) => {
  if (!date) return ''
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true })
  } catch {
    return ''
  }
}

const openConversation = (convId) => {
  router.push(`/chat/conversations/${convId}`)
}

const createNewConversation = async () => {
  try {
    const conv = await store.dispatch('chat/chat/createConversation', {})
    router.push(`/chat/conversations/${conv.id}`)
  } catch (error) {
    ElMessage.error('Failed to create conversation')
    console.error('Failed to create conversation:', error)
  }
}

onMounted(async () => {
  try {
    await store.dispatch('chat/chat/fetchConversations')
  } catch (error) {
    console.error('Failed to fetch conversations:', error)
  }
})
</script>

<script>
export default {
  name: 'CrChatSidebar',
}
</script>

<style lang="scss" scoped>
.chat-sidebar-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 8px 0;
}

.new-chat-btn {
  padding: 0 12px 12px;
}

.search-box {
  padding: 0 12px 12px;
  position: relative;
  
  .sidebar-search {
    width: 100%;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 8px 12px 8px 36px;
    color: #fff;
    font-size: 13px;
    
    &:focus {
      outline: none;
      border-color: rgba(167, 139, 250, 0.5);
    }
    
    &::placeholder {
      color: rgba(255, 255, 255, 0.4);
    }
  }
  
  .search-icon {
    position: absolute;
    left: 24px;
    top: 50%;
    transform: translateY(-50%);
    color: rgba(255, 255, 255, 0.4);
    font-size: 14px;
  }
}

.conversations-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
}

.conv-group {
  margin-bottom: 12px;
}

.group-label {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 8px 8px 4px;
}

.conversation-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease;
  
  i {
    color: rgba(255, 255, 255, 0.4);
    font-size: 14px;
    margin-top: 2px;
  }
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
  
  &.active {
    background: rgba(255, 255, 255, 0.08);
    
    i {
      color: #a78bfa;
    }
  }
}

.conv-info {
  flex: 1;
  min-width: 0;
}

.conv-title {
  display: block;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.conv-time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.no-results, .no-conversations {
  padding: 24px;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  
  i {
    font-size: 28px;
    margin-bottom: 8px;
    display: block;
  }
  
  p {
    font-size: 13px;
    margin: 0;
  }
}
</style>
