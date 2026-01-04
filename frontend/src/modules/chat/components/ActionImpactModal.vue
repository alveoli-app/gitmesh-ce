<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    title="Action Impact Analysis"
    width="800px"
    class="impact-modal"
    @close="$emit('close')"
  >
    <div v-if="loading" class="loading-state">
      <el-skeleton :rows="5" animated />
    </div>

    <div v-else-if="analysis" class="analysis-content">
      <!-- Original Action -->
      <section class="original-action">
        <h3>Original Action</h3>
        <div class="action-summary">
          <el-tag size="small">{{ formatActionType(analysis.action.actionType) }}</el-tag>
          <span class="time">{{ formatTime(analysis.action.createdAt) }}</span>
          <span class="agent">by {{ analysis.action.agentId }}</span>
        </div>
      </section>

      <!-- Impact Metrics -->
      <section v-if="Object.keys(analysis.metrics).length > 0" class="metrics-section">
        <h3>Observed Impact</h3>
        <div class="metrics-grid">
          <div v-for="(value, key) in analysis.metrics" :key="key" class="metric-card">
            <span class="metric-value">{{ value }}</span>
            <span class="metric-label">{{ key }}</span>
          </div>
        </div>
      </section>

      <!-- Timeline -->
      <section class="timeline-section">
        <h3>Activity Timeline</h3>
        <el-timeline>
          <el-timeline-item
            v-for="(event, index) in analysis.timeline"
            :key="index"
            :timestamp="formatTime(event.timestamp)"
            :type="event.type === 'agent_action' ? 'primary' : 'info'"
            placement="top"
          >
            <div class="timeline-content">
              <h4>{{ event.description }}</h4>
              <p v-if="event.details" class="details">
                {{ formatDetails(event.details) }}
              </p>
            </div>
          </el-timeline-item>
        </el-timeline>
      </section>
    </div>

    <div v-else class="error-state">
      <p>Failed to load analysis.</p>
    </div>
  </el-dialog>
</template>

<script>
import { ref, watch } from 'vue'
import { formatDistanceToNow } from 'date-fns'
import ChatApi from '../services/chat-api'

export default {
  name: 'ActionImpactModal',
  props: {
    actionId: {
      type: String,
      required: true,
    },
    visible: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['close', 'update:visible'],
  setup(props) {
    const loading = ref(false)
    const analysis = ref(null)

    const formatActionType = (type) => {
      return type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Unknown'
    }

    const formatTime = (date) => {
      if (!date) return ''
      return formatDistanceToNow(new Date(date), { addSuffix: true })
    }

    const formatDetails = (details) => {
      if (details.type === 'agent_action') {
        return `Status: ${details.status}`
      }
      return ''
    }

    const loadAnalysis = async () => {
      if (!props.actionId) return
      loading.value = true
      try {
        const result = await ChatApi.analyzeAction(props.actionId)
        analysis.value = result
      } catch (error) {
        console.error('Analysis error:', error)
      } finally {
        loading.value = false
      }
    }

    watch(() => props.visible, (newVal) => {
      if (newVal) {
        loadAnalysis()
      }
    })

    return {
      loading,
      analysis,
      formatActionType,
      formatTime,
      formatDetails,
    }
  }
}
</script>

<style lang="scss" scoped>
.impact-modal {
  .analysis-content {
    padding: 16px 0;
  }

  h3 {
    font-size: 16px;
    color: #fff;
    margin-bottom: 16px;
    font-weight: 600;
  }

  .original-action {
    margin-bottom: 32px;
    padding-bottom: 16px;
    border-bottom: 1px solid #27272a;

    .action-summary {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #a1a1aa;
    }
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 16px;
    margin-bottom: 32px;
  }

  .metric-card {
    background: #18181b;
    padding: 16px;
    border-radius: 8px;
    text-align: center;

    .metric-value {
      display: block;
      font-size: 20px;
      color: #fff;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .metric-label {
      font-size: 12px;
      color: #71717a;
    }
  }

  .timeline-content {
    h4 {
      margin: 0 0 4px 0;
      font-size: 14px;
      color: #e4e4e7;
    }
    .details {
      margin: 0;
      font-size: 12px;
      color: #71717a;
    }
  }
}
</style>
