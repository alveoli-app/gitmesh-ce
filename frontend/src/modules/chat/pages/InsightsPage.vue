<template>
  <div class="insights-page">
    <header class="page-header">
      <h1>AI Insights</h1>
      <p class="subtitle">Proactive recommendations from your AI assistants</p>
    </header>

    <!-- Category Tabs -->
    <div class="category-tabs">
      <button 
        v-for="cat in categories" 
        :key="cat.id"
        class="tab"
        :class="{ active: activeCategory === cat.id }"
        @click="activeCategory = cat.id"
      >
        <i :class="cat.icon"></i>
        <span>{{ cat.label }}</span>
        <span v-if="categoryCounts[cat.id]" class="count">{{ categoryCounts[cat.id] }}</span>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <el-skeleton :rows="5" animated />
    </div>

    <!-- Insights List -->
    <div v-else class="insights-list">
      <div 
        v-for="insight in filteredInsights" 
        :key="insight.id" 
        class="insight-card"
        :class="[insight.severity, { dismissed: insight.status === 'dismissed' }]"
      >
        <div class="insight-header">
          <div class="severity-indicator" :class="insight.severity">
            <i :class="getSeverityIcon(insight.severity)"></i>
          </div>
          <div class="insight-meta">
            <span class="category-badge">{{ formatCategory(insight.category) }}</span>
            <span class="timestamp">{{ formatTime(insight.createdAt) }}</span>
          </div>
        </div>

        <h3 class="insight-title">{{ insight.title }}</h3>
        <p class="insight-description">{{ insight.description }}</p>

        <!-- Affected Entities -->
        <div v-if="insight.affectedEntities?.length" class="affected-entities">
          <span 
            v-for="entity in insight.affectedEntities.slice(0, 5)" 
            :key="entity.id"
            class="entity-tag"
            @click="viewEntity(entity)"
          >
            <i :class="getEntityIcon(entity.type)"></i>
            {{ entity.name }}
          </span>
          <span v-if="insight.affectedEntities.length > 5" class="more">
            +{{ insight.affectedEntities.length - 5 }} more
          </span>
        </div>

        <!-- Suggested Actions -->
        <div v-if="insight.suggestedActions?.length" class="suggested-actions">
          <span class="actions-label">Suggested:</span>
          <el-button 
            v-for="action in insight.suggestedActions.slice(0, 2)"
            :key="action.id"
            size="small"
            type="primary"
            plain
            @click="executeAction(insight, action)"
          >
            {{ action.label }}
          </el-button>
        </div>

        <div class="insight-footer">
          <span class="agent-source">
            <i class="ri-robot-2-line"></i>
            {{ formatAgentName(insight.agentId) }}
          </span>
          <div class="insight-actions">
            <el-button 
              size="small" 
              text 
              @click="dismissInsight(insight)"
            >
              <i class="ri-close-line"></i> Dismiss
            </el-button>
            <el-button 
              size="small"
              type="success"
              plain
              @click="resolveInsight(insight)"
            >
              <i class="ri-check-line"></i> Mark Resolved
            </el-button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredInsights.length === 0" class="empty-state">
        <h2>No Insights Yet</h2>
        <p class="empty-description">
          AI analyzes your project data and surfaces actionable recommendations. 
          Insights will appear here as your project evolves.
        </p>
        <div class="insight-examples">
          <div class="insight-example">
            <i class="ri-alarm-warning-line"></i>
            <span>Risk Alerts</span>
            <small>Blockers & overdue items</small>
          </div>
          <div class="insight-example">
            <i class="ri-speed-up-line"></i>
            <span>Optimizations</span>
            <small>Process improvements</small>
          </div>
          <div class="insight-example">
            <i class="ri-scales-3-line"></i>
            <span>Capacity</span>
            <small>Workload balance</small>
          </div>
          <div class="insight-example">
            <i class="ri-calendar-todo-line"></i>
            <span>Deadlines</span>
            <small>Timeline warnings</small>
          </div>
        </div>
        <p class="empty-hint">
          <i class="ri-information-line"></i>
          Start tracking issues and sprints to generate insights
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useStore } from 'vuex'
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatDistanceToNow } from 'date-fns'
import ChatApi from '../services/chat-api'

export default {
  name: 'InsightsPage',
  setup() {
    const store = useStore()

    const loading = ref(true)
    const activeCategory = ref('all')
    const categoryCounts = ref({})

    const categories = [
      { id: 'all', label: 'All', icon: 'ri-apps-line' },
      { id: 'risk', label: 'Risks', icon: 'ri-alarm-warning-line' },
      { id: 'optimization', label: 'Optimizations', icon: 'ri-speed-up-line' },
      { id: 'capacity', label: 'Capacity', icon: 'ri-scales-3-line' },
      { id: 'deadline', label: 'Deadlines', icon: 'ri-calendar-todo-line' },
    ]

    const insights = computed(() => store.state.chat?.chat?.insights || [])

    const filteredInsights = computed(() => {
      if (activeCategory.value === 'all') return insights.value
      return insights.value.filter(i => i.category === activeCategory.value)
    })

    const agentNames = {
      'product-manager': 'Product Manager',
      'capacity-planner': 'Capacity Planner',
      'risk-monitor': 'Risk Monitor',
    }

    const getSeverityIcon = (severity) => {
      switch (severity) {
        case 'critical': return 'ri-error-warning-fill'
        case 'high': return 'ri-alert-fill'
        case 'medium': return 'ri-information-fill'
        default: return 'ri-lightbulb-fill'
      }
    }

    const getEntityIcon = (type) => {
      switch (type) {
        case 'issue': return 'ri-checkbox-circle-line'
        case 'user': return 'ri-user-line'
        case 'cycle': return 'ri-restart-line'
        default: return 'ri-link'
      }
    }

    const formatCategory = (category) => {
      const cat = categories.find(c => c.id === category)
      return cat?.label || category
    }

    const formatAgentName = (id) => agentNames[id] || id || 'AI Agent'

    const formatTime = (date) => {
      if (!date) return ''
      try {
        return formatDistanceToNow(new Date(date), { addSuffix: true })
      } catch {
        return date
      }
    }

    const loadInsights = async () => {
      loading.value = true
      try {
        const result = await store.dispatch('chat/chat/fetchInsights')
        categoryCounts.value = result.byCategory || {}
      } catch (error) {
        ElMessage.error('Failed to load insights')
        console.error('Load insights error:', error)
      } finally {
        loading.value = false
      }
    }

    const dismissInsight = async (insight) => {
      try {
        const { value: reason } = await ElMessageBox.prompt(
          'Why are you dismissing this insight?',
          'Dismiss Insight',
          {
            inputPlaceholder: 'Select a reason...',
            confirmButtonText: 'Dismiss',
          }
        )

        await store.dispatch('chat/chat/dismissInsight', {
          insightId: insight.id,
          reason: reason || 'not_relevant',
        })

        ElMessage.info('Insight dismissed')
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('Failed to dismiss insight')
          console.error('Dismiss error:', error)
        }
      }
    }

    const resolveInsight = async (insight) => {
      try {
        await ChatApi.resolveInsight(insight.id)
        store.commit('chat/chat/REMOVE_INSIGHT', insight.id)
        ElMessage.success('Insight marked as resolved')
      } catch (error) {
        ElMessage.error('Failed to resolve insight')
        console.error('Resolve error:', error)
      }
    }

    const viewEntity = (entity) => {
      console.log('View entity:', entity)
      // Navigation based on entity type
    }

    const executeAction = async (insight, action) => {
      ElMessage.info(`Executing: ${action.label}`)
      // Action execution logic
    }

    onMounted(loadInsights)

    return {
      loading,
      activeCategory,
      categories,
      categoryCounts,
      insights,
      filteredInsights,
      getSeverityIcon,
      getEntityIcon,
      formatCategory,
      formatAgentName,
      formatTime,
      dismissInsight,
      resolveInsight,
      viewEntity,
      executeAction,
    }
  }
}
</script>

<style lang="scss" scoped>
.insights-page {
  padding: 16px;
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 16px;
  
  h1 {
    font-size: 28px;
    font-weight: 600;
    color: #fff;
    margin-bottom: 8px;
  }
  
  .subtitle {
    color: #a1a1aa;
    font-size: 16px;
  }
}

.category-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #27272a;
}

.tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid #27272a;
  color: #a1a1aa;
  cursor: pointer;
  transition: all 0.15s ease;
  
  &:hover {
    background: #18181b;
    color: #fff;
  }
  
  &.active {
    background: #27272a;
    border-color: #3b82f6;
    color: #fff;
    
    i {
      color: #3b82f6;
    }
  }
  
  .count {
    background: #3f3f46;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 12px;
  }
}

.insights-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.insight-card {
  background: #0a0a0a;
  border: 1px solid #27272a;
  border-radius: 12px;
  padding: 16px;
  
  &.critical {
    border-left: 4px solid #3f3f46;
  }
  
  &.high {
    border-left: 4px solid #3f3f46;
  }
  
  &.medium {
    border-left: 4px solid #3f3f46;
  }
  
  &.dismissed {
    opacity: 0.5;
  }
}

.insight-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.severity-indicator {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  
  &.critical {
    background: #27272a;
    color: #fff;
  }
  
  &.high {
    background: #27272a;
    color: #fff;
  }
  
  &.medium {
    background: #27272a;
    color: #fff;
  }
  
  &.low {
    background: #27272a;
    color: #fff;
  }
}

.insight-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
}

.category-badge {
  background: #27272a;
  padding: 4px 8px;
  border-radius: 4px;
  color: #e4e4e7;
}

.timestamp {
  color: #71717a;
}

.insight-title {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 8px;
}

.insight-description {
  font-size: 14px;
  color: #a1a1aa;
  line-height: 1.6;
  margin-bottom: 16px;
}

.affected-entities {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.entity-tag {
  background: #18181b;
  border: 1px solid #27272a;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  color: #e4e4e7;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  
  &:hover {
    border-color: #3f3f46;
  }
  
  i {
    color: #3b82f6;
  }
}

.more {
  font-size: 12px;
  color: #71717a;
  padding: 6px;
}

.suggested-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  
  .actions-label {
    font-size: 12px;
    color: #71717a;
  }
}

.insight-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #27272a;
}

.agent-source {
  font-size: 12px;
  color: #71717a;
  display: flex;
  align-items: center;
  gap: 6px;
  
  i {
    color: #fff;
  }
}

.insight-actions {
  display: flex;
  gap: 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 16px;
  min-height: 300px;
  
  h2 {
    font-size: 24px;
    font-weight: 600;
    color: #fff;
    margin: 0 0 16px 0;
  }
  
  .empty-description {
    font-size: 16px;
    color: #e4e4e7;
    max-width: 500px;
    line-height: 1.6;
    margin: 0 0 32px 0;
  }
  
  .empty-hint {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #71717a;
    margin-top: 24px;
    
    i {
      color: #71717a;
    }
  }
}

.empty-icon-container {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: #18181b;
  border: 1px solid #27272a;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  animation: float 3s ease-in-out infinite;
  
  i {
    font-size: 48px;
    color: #fff;
  }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.insight-examples {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  justify-content: center;
}

.insight-example {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 12px;
  padding: 16px;
  width: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;
  
  &:hover {
    border-color: #3f3f46;
    background: #27272a;
  }
  
  i {
    font-size: 24px;
    color: #3b82f6;
  }
  
  span {
    font-size: 13px;
    font-weight: 600;
    color: #fff;
  }
  
  small {
    font-size: 11px;
    color: #71717a;
    text-align: center;
  }
}
</style>
