<template>
  <div class="agents-page">
    <header class="page-header">
      <h1>AI Agents</h1>
      <p class="subtitle">Configure and monitor your AI assistants</p>
    </header>

    <div v-if="loading" class="loading-state">
      <el-skeleton :rows="5" animated />
    </div>

    <div v-else-if="agents.length === 0" class="empty-state">
      <h2>No AI Agents Configured</h2>
      <p class="empty-description">
        AI agents help automate your project management tasks. They can create issues, 
        generate specs, plan sprints, and provide intelligent recommendations.
      </p>
      <div class="use-cases">
        <div class="use-case">
          <i class="ri-compass-3-line"></i>
          <span>Product Manager</span>
          <small>Prioritize backlog & plan sprints</small>
        </div>
        <div class="use-case">
          <i class="ri-file-text-line"></i>
          <span>Spec Writer</span>
          <small>Generate detailed specifications</small>
        </div>
        <div class="use-case">
          <i class="ri-calendar-check-line"></i>
          <span>Standup Assistant</span>
          <small>Create daily standup reports</small>
        </div>
      </div>
      <el-button type="primary" size="large">
        <i class="ri-settings-3-line"></i>
        Configure AI Agents
      </el-button>
    </div>

    <div v-else class="agents-grid">
      <div 
        v-for="agent in agents" 
        :key="agent.id" 
        class="agent-card"
        :class="{ disabled: !agent.enabled }"
      >
        <div class="agent-header">
          <div class="agent-icon" :class="`icon-${agent.id}`">
            <i :class="getAgentIcon(agent.id)"></i>
          </div>
          <div class="agent-info">
            <h3>{{ agent.name }}</h3>
            <p class="agent-role">{{ agent.role }}</p>
          </div>
          <el-switch 
            v-model="agent.enabled"
            @change="toggleAgent(agent)"
          />
        </div>

        <p class="agent-description">{{ agent.description }}</p>

        <div class="agent-tools">
          <span class="tools-label">Tools:</span>
          <div class="tools-list">
            <el-tag 
              v-for="tool in agent.tools?.slice(0, 4)" 
              :key="tool"
              size="small"
              type="info"
            >
              {{ formatToolName(tool) }}
            </el-tag>
            <el-tag v-if="agent.tools?.length > 4" size="small" type="info">
              +{{ agent.tools.length - 4 }}
            </el-tag>
          </div>
        </div>

        <div v-if="agent.todayStats && agent.todayStats.taskCount > 0" class="agent-stats">
          <div class="stat">
            <span class="stat-value">{{ agent.todayStats.taskCount }}</span>
            <span class="stat-label">Tasks Today</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ agent.todayStats.avgDuration }}ms</span>
            <span class="stat-label">Avg Duration</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ agent.todayStats.successRate }}%</span>
            <span class="stat-label">Success Rate</span>
          </div>
        </div>

        <div class="agent-actions">
          <el-button size="small" text @click="showAgentSettings(agent)">
            <i class="ri-settings-3-line"></i> Configure
          </el-button>
        </div>
      </div>
    </div>

    <!-- Telemetry Section -->
    <section class="telemetry-section" v-if="telemetry">
      <h2>Performance Overview</h2>
      
      <div class="telemetry-summary">
        <div class="summary-card">
          <span class="summary-value">{{ telemetry.summary.totalTasks }}</span>
          <span class="summary-label">Total Tasks (7 days)</span>
        </div>
        <div class="summary-card">
          <span class="summary-value">{{ telemetry.summary.totalTokens.toLocaleString() }}</span>
          <span class="summary-label">Tokens Used</span>
        </div>
        <div class="summary-card">
          <span class="summary-value">{{ telemetry.summary.totalTasks > 0 ? telemetry.summary.successRate + '%' : '-' }}</span>
          <span class="summary-label">Success Rate</span>
        </div>
      </div>

      <div v-if="telemetry.dailyVolume && telemetry.dailyVolume.length > 0" class="chart-section">
        <!-- Chart will be rendered here when data exists -->
        <div class="daily-volume-chart">
          <div v-for="day in telemetry.dailyVolume" :key="day.date" class="chart-bar">
            <div class="bar" :style="{ height: getBarHeight(day.count) + 'px' }"></div>
            <span class="chart-label">{{ formatDate(day.date) }}</span>
          </div>
        </div>
      </div>
      <div v-else class="no-data-message">
        <i class="ri-bar-chart-box-line"></i>
        <p>No activity recorded in the last 7 days</p>
        <small>Start using AI agents to see performance metrics here</small>
      </div>
    </section>

    <!-- Settings Dialog -->
    <el-dialog 
      v-model="settingsDialogVisible"
      :title="`Configure ${selectedAgent?.name}`"
      width="500px"
    >
      <el-form v-if="selectedAgent" label-position="top">
        <el-form-item label="Temperature">
          <el-slider 
            v-model="agentSettings.temperature"
            :min="0"
            :max="1"
            :step="0.1"
            :marks="{ 0: 'Precise', 0.5: 'Balanced', 1: 'Creative' }"
          />
        </el-form-item>
        <el-form-item label="Require Approval">
          <el-switch v-model="agentSettings.approvalRequired" />
          <span class="form-hint">Require user approval before executing actions</span>
        </el-form-item>
        <el-form-item label="Custom Instructions">
          <el-input 
            v-model="agentSettings.customPrompt"
            type="textarea"
            :rows="4"
            placeholder="Add custom instructions for this agent..."
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="settingsDialogVisible = false">Cancel</el-button>
        <el-button type="primary" @click="saveAgentSettings">Save</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { ElMessage } from 'element-plus'
import ChatApi from '../services/chat-api'

export default {
  name: 'AgentsPage',
  setup() {
    const store = useStore()

    const loading = ref(true)
    const telemetry = ref(null)
    const settingsDialogVisible = ref(false)
    const selectedAgent = ref(null)
    const agentSettings = ref({
      temperature: 0.7,
      approvalRequired: true,
      customPrompt: '',
    })

    const agents = computed(() => store.state.chat?.chat?.agents || [])

    const agentIcons = {
      'product-manager': 'ri-compass-3-line',
      'spec-writer': 'ri-file-text-line',
      'standup-assistant': 'ri-calendar-check-line',
      'capacity-planner': 'ri-scales-3-line',
      'issue-breakdown': 'ri-git-branch-line',
    }

    const getAgentIcon = (id) => agentIcons[id] || 'ri-robot-2-line'

    const formatToolName = (tool) => {
      return tool.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    }

    const toggleAgent = async (agent) => {
      try {
        await store.dispatch('chat/chat/toggleAgent', {
          agentId: agent.id,
          enabled: agent.enabled
        })
        ElMessage.success(`${agent.name} ${agent.enabled ? 'enabled' : 'disabled'}`)
      } catch (error) {
        agent.enabled = !agent.enabled  // Revert
        ElMessage.error('Failed to update agent')
        console.error('Toggle agent error:', error)
      }
    }

    const showAgentSettings = (agent) => {
      selectedAgent.value = agent
      agentSettings.value = {
        temperature: agent.temperature || 0.7,
        approvalRequired: agent.approvalRequired !== false,
        customPrompt: agent.customPrompt || '',
      }
      settingsDialogVisible.value = true
    }

    const saveAgentSettings = async () => {
      try {
        await ChatApi.updateAgent(selectedAgent.value.id, agentSettings.value)
        ElMessage.success('Settings saved')
        settingsDialogVisible.value = false
      } catch (error) {
        ElMessage.error('Failed to save settings')
        console.error('Save settings error:', error)
      }
    }

    const loadData = async () => {
      loading.value = true
      try {
        await store.dispatch('chat/chat/fetchAgents')
        const telemetryData = await ChatApi.getAgentTelemetry()
        telemetry.value = telemetryData
      } catch (error) {
        ElMessage.error('Failed to load agents')
        console.error('Load agents error:', error)
      } finally {
        loading.value = false
      }
    }

    onMounted(loadData)

    const getBarHeight = (count) => {
      if (!telemetry.value?.dailyVolume) return 0
      const maxCount = Math.max(...telemetry.value.dailyVolume.map(d => d.count))
      return maxCount > 0 ? Math.max(4, (count / maxCount) * 100) : 0
    }

    const formatDate = (dateStr) => {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    }

    return {
      loading,
      agents,
      telemetry,
      settingsDialogVisible,
      selectedAgent,
      agentSettings,
      getAgentIcon,
      formatToolName,
      toggleAgent,
      showAgentSettings,
      saveAgentSettings,
      getBarHeight,
      formatDate,
    }
  }
}
</script>

<style lang="scss" scoped>
.agents-page {
  padding: 16px;
  max-width: 1200px;
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

.agents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

// Empty State
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
    color: #a1a1aa;
    max-width: 500px;
    line-height: 1.6;
    margin: 0 0 32px 0;
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

.use-cases {
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
  flex-wrap: wrap;
  justify-content: center;
}

.use-case {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 12px;
  padding: 20px;
  width: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transition: all 0.15s ease;
  
  &:hover {
    border-color: #3f3f46;
    background: #27272a;
  }
  
  i {
    font-size: 28px;
    color: #fff;
  }
  
  span {
    font-size: 14px;
    font-weight: 600;
    color: #fff;
  }
  
  small {
    font-size: 12px;
    color: #71717a;
    text-align: center;
  }
}

.agent-card {
  background: #0a0a0a;
  border: 1px solid #27272a;
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s ease;

  &:hover {
    border-color: #3f3f46;
  }

  &.disabled {
    opacity: 0.6;
  }
}

.agent-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.agent-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #fff;
  background: #18181b;
  border: 1px solid #27272a;
}

.agent-info {
  flex: 1;
  
  h3 {
    font-size: 16px;
    font-weight: 600;
    color: #fff;
    margin-bottom: 4px;
  }
  
  .agent-role {
    font-size: 12px;
    color: #71717a;
    margin: 0;
  }
}

.agent-description {
  font-size: 14px;
  color: #a1a1aa;
  line-height: 1.5;
  margin-bottom: 16px;
}

.agent-tools {
  margin-bottom: 16px;
  
  .tools-label {
    font-size: 12px;
    color: #71717a;
    display: block;
    margin-bottom: 8px;
  }
  
  .tools-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
}

.agent-stats {
  display: flex;
  gap: 24px;
  padding: 16px 0;
  border-top: 1px solid #27272a;
  margin-bottom: 12px;
}

.stat {
  display: flex;
  flex-direction: column;
  
  .stat-value {
    font-size: 18px;
    font-weight: 600;
    color: #fff;
  }
  
  .stat-label {
    font-size: 11px;
    color: #71717a;
  }
}

.agent-actions {
  display: flex;
  justify-content: flex-end;
}

.telemetry-section {
  background: #0a0a0a;
  border: 1px solid #27272a;
  border-radius: 12px;
  padding: 16px;
  
  h2 {
    font-size: 20px;
    font-weight: 600;
    color: #fff;
    margin-bottom: 24px;
  }
}

.telemetry-summary {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
}

.summary-card {
  background: #18181b;
  border-radius: 12px;
  padding: 20px;
  flex: 1;
  text-align: center;
  
  .summary-value {
    display: block;
    font-size: 32px;
    font-weight: 600;
    color: #fff;
    margin-bottom: 4px;
  }
  
  .summary-label {
    font-size: 12px;
    color: #a1a1aa;
  }
}

.chart-section {
  background: #18181b;
  border-radius: 12px;
  padding: 20px;
}

.daily-volume-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 120px;
  gap: 8px;
}

.chart-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  
  .bar {
    width: 32px;
    background: #fff;
    border-radius: 4px 4px 0 0;
    min-height: 4px;
  }
  
  .chart-label {
    font-size: 11px;
    color: #71717a;
  }
}

.no-data-message {
  background: #18181b;
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  
  i {
    font-size: 32px;
    color: #3f3f46;
  }
  
  p {
    font-size: 14px;
    color: #71717a;
    margin: 0;
  }
  
  small {
    font-size: 12px;
    color: #52525b;
  }
}

.form-hint {
  font-size: 12px;
  color: #71717a;
  margin-left: 8px;
}

:deep(.el-tag--info) {
  background-color: #18181b;
  border-color: #3f3f46;
  color: #e4e4e7;
}
</style>
