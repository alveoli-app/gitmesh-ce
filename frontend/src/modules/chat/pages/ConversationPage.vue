<template>
  <div class="conversation-page">
    <!-- Welcome / Empty State -->
    <div v-if="!conversationId" class="welcome-state">
      <div class="welcome-content">
        <h2>Welcome to AI Chat</h2>
        <p>Start a conversation with your AI-powered project assistant</p>
        
        <div class="suggestions">
          <h3>Try asking:</h3>
          <div class="suggestion-cards">
            <div 
              v-for="suggestion in suggestions" 
              :key="suggestion.id"
              class="suggestion-card"
              @click="startWithSuggestion(suggestion)"
            >
              <i :class="suggestion.icon"></i>
              <span>{{ suggestion.text }}</span>
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <div class="welcome-input-area">
          <div class="input-container">
            <textarea
              ref="messageInput"
              v-model="newMessage"
              placeholder="Ask anything about your project..."
              rows="1"
              @keydown.enter.exact.prevent="sendMessage"
              @input="handleInput"
            ></textarea>
            <el-button 
              type="primary"
              circle
              :disabled="!newMessage.trim() || isSending"
              :loading="isSending"
              @click="sendMessage"
            >
              <i v-if="!isSending" class="ri-send-plane-2-fill"></i>
            </el-button>
          </div>
          <div class="input-hints">
            <span>Press Enter to send</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Conversation View -->
    <div v-else class="conversation-view">
        <!-- Header -->
        <header class="conversation-header">
          <div class="header-left">
            <h2>{{ conversation?.title || 'New Conversation' }}</h2>
            <span v-if="conversation?.project" class="project-badge">
              <i class="ri-folder-line"></i>
              {{ conversation.project.name }}
            </span>
          </div>
          <div class="header-actions">
            <el-dropdown trigger="click" @command="handleHeaderAction">
              <el-button type="text" icon="ri-more-2-fill" />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="rename">
                    <i class="ri-edit-line"></i> Rename
                  </el-dropdown-item>
                  <el-dropdown-item command="delete" divided>
                    <i class="ri-delete-bin-line"></i> Delete
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </header>

        <!-- Messages -->
        <div ref="messagesContainer" class="messages-container">
          <div 
            v-for="message in messages" 
            :key="message.id"
            class="message"
            :class="message.senderType"
          >
            <div class="message-avatar">
              <i v-if="message.senderType === 'agent'" class="ri-robot-2-line"></i>
              <i v-else class="ri-user-line"></i>
            </div>
            <div class="message-content">
              <div v-if="message.senderType === 'agent'" class="agent-name">
                {{ getAgentName(message.agentId) }}
              </div>
              <div class="message-text" v-html="renderMarkdown(message.content)" />
              
              <!-- Streaming indicator -->
              <div v-if="message.isStreaming" class="streaming-indicator">
                <span class="dot" />
                <span class="dot" />
                <span class="dot" />
              </div>

              <!-- Message actions for agent messages -->
              <div v-if="message.senderType === 'agent' && !message.isStreaming" class="message-actions">
                <button 
                  class="action-btn" 
                  :class="{ active: message.feedbackRating > 3 }"
                  @click="submitFeedback(message.id, 5)"
                  title="Helpful"
                >
                  <i class="ri-thumb-up-line"></i>
                </button>
                <button 
                  class="action-btn"
                  :class="{ active: message.feedbackRating && message.feedbackRating <= 3 }"
                  @click="submitFeedback(message.id, 2)"
                  title="Not helpful"
                >
                  <i class="ri-thumb-down-line"></i>
                </button>
                <button class="action-btn" @click="copyMessage(message)" title="Copy">
                  <i class="ri-file-copy-line"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- Action Proposals -->
          <div class="proposals-container" v-if="pendingProposals.length > 0">
            <div class="proposals-divider">
              <span>Pending Actions</span>
            </div>
            <ActionCard 
              v-for="proposal in pendingProposals" 
              :key="proposal.id" 
              :proposal="proposal"
              :is-processing="approvingProposal === proposal.id || rejectingProposal === proposal.id"
              @approve="approveProposal"
              @reject="rejectProposal"
              @modify="modifyProposal"
            />
          </div>
        </div>

        <!-- Input Area -->
        <div class="input-area">
          <!-- Typing Indicator -->
          <div v-if="typingText" class="typing-indicator-bar">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="text">{{ typingText }}</span>
          </div>

          <!-- Slash Command Menu -->
          <div v-if="showSlashMenu" class="slash-menu">
            <div 
              v-for="(cmd, index) in filteredSlashCommands" 
              :key="cmd.command"
              class="slash-item"
              :class="{ active: index === slashMenuIndex }"
              @click="selectSlashCommand(cmd)"
              @mouseenter="slashMenuIndex = index"
            >
              <i :class="cmd.icon"></i>
              <span class="cmd-name">{{ cmd.command }}</span>
              <span class="cmd-desc">{{ cmd.description }}</span>
            </div>
          </div>

          <div class="input-container">
            <textarea
              ref="messageInput"
              v-model="newMessage"
              placeholder="Ask anything about your project... (Type / for commands)"
              rows="1"
              @keydown.enter.exact.prevent="sendMessage"
              @keydown.up.prevent="slashMenuIndex = Math.max(0, slashMenuIndex - 1)"
              @keydown.down.prevent="slashMenuIndex = Math.min(filteredSlashCommands.length - 1, slashMenuIndex + 1)"
              @keydown.tab.prevent="selectSlashCommand(filteredSlashCommands[slashMenuIndex])"
              @input="handleInput"
            />
            <el-button 
              type="primary"
              circle
              :disabled="!newMessage.trim() || isSending"
              :loading="isSending"
              @click="sendMessage"
            >
              <i v-if="!isSending" class="ri-send-plane-2-fill"></i>
            </el-button>
          </div>
          <div class="input-hints">
            <span>Press Enter to send</span>
            <span>•</span>
            <span>Type / for commands</span>
          </div>
        </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useStore } from 'vuex'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns'
import ChatApi from '../services/chat-api'
import ActionCard from '../components/ActionCard.vue'

export default {
  name: 'ConversationPage',
  components: { ActionCard },
  setup() {
    const store = useStore()
    const route = useRoute()
    const router = useRouter()

    const messagesContainer = ref(null)
    const messageInput = ref(null)
    const newMessage = ref('')
    const isSending = ref(false)
    const approvingProposal = ref(null)
    const rejectingProposal = ref(null)

    const conversationId = computed(() => route.params.conversationId)
    const conversation = computed(() => store.state.chat?.chat?.activeConversation)
    const messages = computed(() => {
      const getter = store.getters['chat/chat/getMessagesForConversation']
      return getter ? getter(conversationId.value) : []
    })
    const pendingProposals = computed(() => store.state.chat?.chat?.pendingProposals || [])
    
    // History Sidebar State
    const searchQuery = ref('')
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

    const suggestions = [
      { id: 1, text: "What should we prioritize in the next sprint?", icon: 'ri-focus-3-line' },
      { id: 2, text: "Generate standup report for yesterday", icon: 'ri-calendar-check-line' },
      { id: 3, text: "Who has capacity to take on Issue #45?", icon: 'ri-team-line' },
      { id: 4, text: "Break down this feature into sub-tasks", icon: 'ri-git-branch-line' },
      { id: 5, text: "Show me overdue issues this week", icon: 'ri-alarm-warning-line' },
      { id: 6, text: "Summarize recent pull request activity", icon: 'ri-git-pull-request-line' },
    ]

    const agentNames = {
      'product-manager': 'Product Manager',
      'spec-writer': 'Spec Writer',
      'standup-assistant': 'Standup Assistant',
      'capacity-planner': 'Capacity Planner',
      'issue-breakdown': 'Issue Breakdown',
    }

    const getAgentName = (agentId) => agentNames[agentId] || 'AI Assistant'

    const renderMarkdown = (content) => {
      if (!content) return ''
      try {
        const html = marked.parse(content, { breaks: true })
        return DOMPurify.sanitize(html)
      } catch {
        return content
      }
    }

    const formatActionType = (type) => {
      const types = {
        create_issue: 'Create Issue',
        update_issue: 'Update Issue',
        assign_issue: 'Assign Issue',
        create_spec: 'Create Specification',
      }
      return types[type] || type
    }

    const scrollToBottom = () => {
      nextTick(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }
      })
    }

    const autoResize = () => {
      if (messageInput.value) {
        messageInput.value.style.height = 'auto'
        messageInput.value.style.height = Math.min(messageInput.value.scrollHeight, 200) + 'px'
      }
    }

    const sendMessage = async () => {
      if (!newMessage.value.trim() || isSending.value) return
      
      const content = newMessage.value.trim()
      newMessage.value = ''
      isSending.value = true

      try {
        // Create conversation if needed
        let targetConversationId = conversationId.value
        if (!targetConversationId) {
          const conv = await store.dispatch('chat/chat/createConversation', {})
          targetConversationId = conv.id
          router.replace(`/chat/conversations/${conv.id}`)
        }

        await store.dispatch('chat/chat/sendMessage', {
          conversationId: targetConversationId,
          content,
        })

        scrollToBottom()
      } catch (error) {
        ElMessage.error('Failed to send message')
        console.error('Send message error:', error)
      } finally {
        isSending.value = false
        autoResize()
      }
    }

    const startWithSuggestion = async (suggestion) => {
      newMessage.value = suggestion.text
      await nextTick()
      sendMessage()
    }

    const approveProposal = async (proposalId) => {
      approvingProposal.value = proposalId
      try {
        await store.dispatch('chat/chat/approveProposal', proposalId)
        ElMessage.success('Action executed successfully')
      } catch (error) {
        ElMessage.error('Failed to execute action')
        console.error('Approve proposal error:', error)
      } finally {
        approvingProposal.value = null
      }
    }

    const rejectProposal = async (proposalId) => {
      try {
        const { value: reason } = await ElMessageBox.prompt(
          'Why are you rejecting this action?',
          'Reject Action',
          { inputPlaceholder: 'Optional reason...', confirmButtonText: 'Reject', cancelButtonText: 'Cancel' }
        )
        
        rejectingProposal.value = proposalId
        await store.dispatch('chat/chat/rejectProposal', { proposalId, reason })
        ElMessage.info('Action rejected')
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('Failed to reject action')
          console.error('Reject proposal error:', error)
        }
      } finally {
        rejectingProposal.value = null
      }
    }

    const modifyProposal = async (proposal) => {
      // For now, just show a message. In real impl, open a modal.
      ElMessage.info('Modification UI coming soon. Please reject and ask agent to change it.')
    }

    const submitFeedback = async (messageId, rating) => {
      try {
        await ChatApi.submitFeedback(messageId, { rating })
        store.commit('chat/chat/UPDATE_MESSAGE', {
          conversationId: conversationId.value,
          messageId,
          updates: { feedbackRating: rating }
        })
      } catch (error) {
        console.error('Failed to submit feedback:', error)
      }
    }

    const copyMessage = async (message) => {
      try {
        await navigator.clipboard.writeText(message.content)
        ElMessage.success('Copied to clipboard')
      } catch {
        ElMessage.error('Failed to copy')
      }
    }

    const handleHeaderAction = async (command) => {
      switch (command) {
        case 'rename':
          try {
            const { value: title } = await ElMessageBox.prompt(
              'Enter new title',
              'Rename Conversation',
              { inputValue: conversation.value?.title, confirmButtonText: 'Save' }
            )
            await ChatApi.updateConversation(conversationId.value, { title })
            store.commit('chat/chat/SET_ACTIVE_CONVERSATION', {
              ...conversation.value,
              title
            })
          } catch {}
          break
        case 'delete':
          try {
            await ElMessageBox.confirm(
              'Are you sure you want to delete this conversation?',
              'Delete Conversation',
              { confirmButtonText: 'Delete', type: 'warning' }
            )
            await store.dispatch('chat/chat/deleteConversation', conversationId.value)
            router.push('/chat/conversations')
          } catch {}
          break
      }
    }
    
    // Slash Commands
    const showSlashMenu = ref(false)
    const slashQuery = ref('')
    const slashMenuIndex = ref(0)
    
    const slashCommands = [
      { command: '/reset', description: 'Reset context', icon: 'ri-refresh-line' },
      { command: '/cycle', description: 'Check cycle status', icon: 'ri-loop-right-line' },
      { command: '/search', description: 'Search issues', icon: 'ri-search-line' },
      { command: '/create', description: 'Create new issue', icon: 'ri-add-circle-line' },
      { command: '/help', description: 'Show help', icon: 'ri-question-line' },
    ]
    
    const filteredSlashCommands = computed(() => {
      if (!slashQuery.value) return slashCommands
      return slashCommands.filter(c => c.command.includes(slashQuery.value))
    })

    const handleInput = (e) => {
      autoResize()
      
      const val = newMessage.value
      const lastWord = val.split(' ').pop()
      
      if (lastWord.startsWith('/')) {
        showSlashMenu.value = true
        slashQuery.value = lastWord
        slashMenuIndex.value = 0
      } else {
        showSlashMenu.value = false
      }
    }
    
    const selectSlashCommand = (cmd) => {
      const words = newMessage.value.split(' ')
      words.pop() // remove partial command
      newMessage.value = words.join(' ') + (words.length ? ' ' : '') + cmd.command + ' '
      showSlashMenu.value = false
      messageInput.value.focus()
    }

    // Load conversation when ID changes
    watch(conversationId, async (newId) => {
      if (newId) {
        try {
          await store.dispatch('chat/chat/loadConversation', newId)
          scrollToBottom()
        } catch (error) {
          ElMessage.error('Failed to load conversation')
          console.error('Load conversation error:', error)
        }
      }
    }, { immediate: true })

    // Scroll when messages change
    watch(messages, () => scrollToBottom(), { deep: true })

    // Typing Indicators
    const typingUsers = ref(new Set())
    const typingTimeout = ref(null)

    const typingUserText = computed(() => {
      if (typingUsers.value.size === 0) return ''
      const names = Array.from(typingUsers.value)
      if (names.length === 1) return `${names[0]} is typing...`
      if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`
      return 'Several people are typing...'
    })

    const handleTypingStart = ({ conversationId: id, userName }) => {
      if (id === conversationId.value) {
        typingUsers.value.add(userName)
        // Auto-clear after 5s in case stop event missed
        setTimeout(() => typingUsers.value.delete(userName), 5000)
      }
    }

    const handleTypingStop = ({ conversationId: id, userName }) => {
      if (id === conversationId.value) {
        // We received userId in event but here assuming userName mapping or passed from backend
        // Ideally backend sends userName too. I updated backend to send userName.
        // Wait, backend sends { conversationId, userId, userName } on start, 
        // but only { conversationId, userId } on stop.
        // So I need to map userId to name or just clear all if complex.
        // Simpler: Just clear the specific user if we can track by ID, but for now let's just use the text.
        // Actually, let's just clear logic:
        // Since I stored names in Set, I can't remove by ID easily without a map.
        // Let's change Set to Map<UserId, UserName>
      }
    }

    // Refactored State
    const typingMap = ref(new Map())
    const computedTypingText = computed(() => {
        if (typingMap.value.size === 0) return ''
        const names = Array.from(typingMap.value.values())
        if (names.length === 1) return `${names[0]} is typing...`
        return 'Multiple people are typing...'
    })

    onMounted(() => {
      if (messageInput.value) {
        messageInput.value.focus()
      }

      // Socket Listeners (only if socket is available)
      if (ChatApi.socket) {
        ChatApi.socket.onTypingStart(({ conversationId: id, userId, userName }) => {
            if (id === conversationId.value) {
                typingMap.value.set(userId, userName)
                setTimeout(() => typingMap.value.delete(userId), 5000)
            }
        })

        ChatApi.socket.onTypingStop(({ conversationId: id, userId }) => {
            if (id === conversationId.value) {
                typingMap.value.delete(userId)
            }
        })
      }
    })

    let emitTypingTimeout = null
    const handleInputTyping = () => {
        if (!emitTypingTimeout) {
            ChatApi.socket.sendTypingStart(conversationId.value)
            emitTypingTimeout = setTimeout(() => {
                emitTypingTimeout = null
                ChatApi.socket.sendTypingStop(conversationId.value)
            }, 3000)
        }
    }

    // Update handleInput to call this
    const originalHandleInput = handleInput
    const handleInputWrapper = (e) => {
        originalHandleInput(e)
        handleInputTyping()
    }

    return {
      // History Sidebar
      searchQuery,
      groupedConversations,
      hasConversations,
      formatTime,
      openConversation,
      createNewConversation,
      // Conversation State
      messagesContainer,
      messageInput,
      newMessage,
      isSending,
      approvingProposal,
      rejectingProposal,
      conversationId,
      conversation,
      messages,
      pendingProposals,
      suggestions,
      showSlashMenu,
      filteredSlashCommands,
      slashMenuIndex,
      getAgentName,
      renderMarkdown,
      formatActionType,
      autoResize,
      sendMessage,
      startWithSuggestion,
      approveProposal,
      rejectProposal,
      modifyProposal,
      submitFeedback,
      copyMessage,
      handleHeaderAction,
      handleInput: handleInputWrapper,
      selectSlashCommand,
      typingText: computedTypingText,
    }
  }
}
</script>

<style lang="scss" scoped>
.conversation-page {
  height: 100%;
  display: flex;
  flex-direction: row;
}

// History Sidebar
.history-sidebar {
  width: 280px;
  background: #0a0a0a;
  border-right: 1px solid #27272a;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #27272a;
  
  h3 {
    font-size: 16px;
    font-weight: 600;
    color: #fff;
    margin: 0;
  }
}

.search-box {
  padding: 12px;
  position: relative;
  
  .sidebar-search {
    width: 100%;
    background: #18181b;
    border: 1px solid #27272a;
    border-radius: 8px;
    padding: 8px 12px 8px 36px;
    color: #fff;
    font-size: 13px;
    
    &:focus {
      outline: none;
      border-color: #3b82f6;
    }
    
    &::placeholder {
      color: #71717a;
    }
  }
  
  .search-icon {
    position: absolute;
    left: 24px;
    top: 50%;
    transform: translateY(-50%);
    color: #71717a;
  }
}

.conversations-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.conv-group {
  margin-bottom: 16px;
}

.group-label {
  font-size: 11px;
  font-weight: 600;
  color: #71717a;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 8px 12px;
}

.conversation-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease;
  
  i {
    color: #71717a;
    font-size: 16px;
    margin-top: 2px;
  }
  
  &:hover {
    background: #18181b;
  }
  
  &.active {
    background: #27272a;
    
    i {
      color: #3b82f6;
    }
  }
}

.conv-info {
  flex: 1;
  min-width: 0;
}

.conv-title {
  display: block;
  font-size: 14px;
  color: #e4e4e7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.conv-time {
  font-size: 12px;
  color: #71717a;
}

.no-results, .no-conversations {
  padding: 24px;
  text-align: center;
  color: #71717a;
  
  i {
    font-size: 32px;
    margin-bottom: 12px;
    display: block;
  }
  
  p {
    font-size: 14px;
    margin-bottom: 12px;
  }
}

// Main Content
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #09090b;
}

// Welcome State
.welcome-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.welcome-content {
  max-width: 600px;
  width: 100%;
  text-align: center;
  padding: 24px;
}

.welcome-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  border-radius: 50%;
  background: #18181b;
  border: 1px solid #27272a;
  display: flex;
  align-items: center;
  justify-content: center;
  
  i {
    font-size: 40px;
    color: #fff;
  }
}

.welcome-content h2 {
  font-size: 28px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 12px 0;
}

.welcome-content > p {
  font-size: 16px;
  color: #a1a1aa;
  margin: 0 0 32px 0;
}

.suggestions h3 {
  font-size: 14px;
  color: #71717a;
  margin: 0 0 16px 0;
}

.suggestion-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 24px;
}

.suggestion-card {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  
  &:hover {
    background: #27272a;
    border-color: #3f3f46;
  }
  
  i {
    font-size: 20px;
    color: #3b82f6;
  }
  
  span {
    font-size: 14px;
    color: #e4e4e7;
  }
}

.welcome-input-area {
  max-width: 600px;
  margin: 0 auto;
  
  .input-container {
    display: flex;
    gap: 8px;
    align-items: flex-end;
    
    textarea {
      flex: 1;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      padding: 12px 16px;
      color: #fff;
      font-size: 14px;
      resize: none;
      min-height: 44px;
      
      &::placeholder {
        color: #71717a;
      }
      
      &:focus {
        outline: none;
        border-color: #3b82f6;
      }
    }
  }
  
  .input-hints {
    text-align: center;
    margin-top: 8px;
    font-size: 12px;
    color: #52525b;
  }
}

// Input Area Updates
.input-area {
  padding: 16px 24px;
  border-top: 1px solid #27272a;
  background: #0a0a0a;
  position: relative; // For slash menu positioning
}

.typing-indicator-bar {
    position: absolute;
    top: -24px;
    left: 24px;
    font-size: 12px;
    color: #a1a1aa;
    display: flex;
    align-items: center;
    gap: 4px;

    .dot {
        width: 4px;
        height: 4px;
        background: #a1a1aa;
        border-radius: 50%;
        animation: pulse 1s infinite;
        &:nth-child(2) { animation-delay: 0.2s; }
    }
}


.slash-menu {
  position: absolute;
  bottom: 100%;
  left: 24px;
  width: 250px;
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 8px;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.5);
  margin-bottom: 8px;
  overflow: hidden;
  z-index: 10;
  
  .slash-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    cursor: pointer;
    transition: background-color 0.15s ease;
    
    &:hover, &.active {
      background: #27272a;
    }
    
    i {
      color: #3b82f6;
      font-size: 16px;
    }
    
    .cmd-name {
      color: #fff;
      font-weight: 500;
      font-size: 14px;
    }
    
    .cmd-desc {
      color: #71717a;
      font-size: 12px;
      margin-left: auto;
    }
  }
}

// ... (rest of styles)


.empty-content {
  text-align: center;
  max-width: 600px;
}

.empty-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  border-radius: 50%;
  margin: 0 auto 24px;
  border-radius: 50%;
  background: #18181b;
  border: 1px solid #27272a;
  display: flex;
  align-items: center;
  justify-content: center;
  
  i {
    font-size: 40px;
    color: #fff;
  }
}

.empty-content h2 {
  font-size: 28px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 12px;
}

.empty-content p {
  font-size: 16px;
  color: #a1a1aa;
  margin-bottom: 32px;
}

.suggestions h3 {
  font-size: 14px;
  color: #71717a;
  margin-bottom: 16px;
}

.suggestion-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.suggestion-card {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  
  &:hover {
    background: #27272a;
    border-color: #3f3f46;
  }
  
  i {
    font-size: 20px;
    color: #3b82f6;
  }
  
  span {
    font-size: 14px;
    color: #e4e4e7;
  }
}

// Empty State Input Area
.empty-input-area {
  width: 100%;
  max-width: 600px;
  margin-top: 32px;
  
  .input-container {
    display: flex;
    gap: 8px;
    align-items: flex-end;
    
    textarea {
      flex: 1;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      padding: 12px 16px;
      color: #fff;
      font-size: 14px;
      line-height: 1.5;
      resize: none;
      min-height: 44px;
      max-height: 200px;
      
      &::placeholder {
        color: #71717a;
      }
      
      &:focus {
        outline: none;
        border-color: #3b82f6;
      }
    }
  }
  
  .input-hints {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 8px;
    font-size: 12px;
    color: #52525b;
  }
}

// Conversation View
.conversation-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.conversation-header {
  padding: 16px 24px;
  border-bottom: 1px solid #27272a;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  h2 {
    font-size: 18px;
    font-weight: 600;
    color: #fff;
    margin: 0;
  }
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.project-badge {
  font-size: 12px;
  color: #a1a1aa;
  background: #27272a;
  padding: 4px 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

// Messages
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.message {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  padding: 0 16px;
  
  &.user {
    flex-direction: row-reverse;
    
    .message-content {
      background: #3f3f46;
      border-radius: 16px 16px 4px 16px;
    }
    
    .message-avatar {
      background: #27272a;
    }
  }
  
  &.agent {
    .message-content {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 16px 16px 16px 4px;
    }
    
    .message-avatar {
      background: #18181b;
      border: 1px solid #27272a;
    }
  }
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  i {
    font-size: 18px;
    color: #fff;
  }
}

.message-content {
  max-width: 70%;
  padding: 12px 16px;
}

.agent-name {
  font-size: 12px;
  color: #3b82f6;
  font-weight: 500;
  margin-bottom: 4px;
}

.message-text {
  font-size: 14px;
  line-height: 1.6;
  color: #e4e4e7;
  
  :deep(p) {
    margin: 0 0 8px;
    &:last-child { margin-bottom: 0; }
  }
  
  :deep(code) {
    background: #27272a;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 13px;
  }
  
  :deep(pre) {
    background: #0a0a0a;
    padding: 12px;
    border-radius: 8px;
    overflow-x: auto;
    
    code {
      background: transparent;
      padding: 0;
    }
  }
}

.streaming-indicator {
  display: flex;
  gap: 4px;
  padding-top: 8px;
  
  .dot {
    width: 6px;
    height: 6px;
    background: #71717a;
    border-radius: 50%;
    animation: pulse 1.4s infinite;
    
    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }
}

@keyframes pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

.message-actions {
  display: flex;
  gap: 4px;
  margin-top: 8px;
}

.action-btn {
  background: transparent;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  color: #71717a;
  transition: all 0.15s ease;
  
  &:hover {
    background: #27272a;
    color: #e4e4e7;
  }
  
  &.active {
    color: #3b82f6;
  }
}

// Proposal Cards
.proposal-card {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 12px;
  margin-bottom: 16px;
  overflow: hidden;
}

.proposal-header {
  background: #27272a;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-weight: 500;
}

.proposal-content {
  padding: 16px;
}

.proposal-type {
  font-weight: 600;
  color: #fff;
  margin-bottom: 8px;
}

.proposal-reasoning {
  color: #a1a1aa;
  font-size: 14px;
  margin-bottom: 12px;
}

.affected-entities {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  
  .label {
    font-size: 12px;
    color: #71717a;
  }
  
  .entity-tag {
    background: #27272a;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    color: #e4e4e7;
  }
}

.proposal-actions {
  padding: 12px 16px;
  border-top: 1px solid #27272a;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

// Input Area
.input-area {
  padding: 16px 24px;
  border-top: 1px solid #27272a;
  background: #0a0a0a;
}

.input-container {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  
  textarea {
    flex: 1;
    background: #18181b;
    border: 1px solid #27272a;
    border-radius: 12px;
    padding: 12px 16px;
    color: #fff;
    font-size: 14px;
    line-height: 1.5;
    resize: none;
    min-height: 44px;
    max-height: 200px;
    
    &::placeholder {
      color: #71717a;
    }
    
    &:focus {
      outline: none;
      border-color: #3b82f6;
    }
  }
}

.input-hints {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  font-size: 12px;
  color: #52525b;
}
</style>
