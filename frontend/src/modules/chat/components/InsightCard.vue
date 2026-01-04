<template>
  <div class="insight-card" :class="[insight.severity, insight.status]">
    <!-- Skeleton Loader -->
    <div v-if="loading" class="card-body">
      <el-skeleton animated>
        <template #template>
          <div style="padding: 12px 16px; display: flex; justify-content: space-between;">
            <el-skeleton-item variant="text" style="width: 30%" />
            <el-skeleton-item variant="text" style="width: 10%" />
          </div>
          <div style="padding: 16px;">
            <el-skeleton-item variant="p" style="width: 100%; margin-bottom: 8px;" />
            <el-skeleton-item variant="p" style="width: 60%" />
          </div>
        </template>
      </el-skeleton>
    </div>

    <!-- Content -->
    <template v-else>
    <div class="card-header">
      <div class="header-left">
        <div class="severity-indicator" :class="insight.severity">
          <i :class="getSeverityIcon(insight.severity)"></i>
        </div>
        <div class="insight-info">
          <span class="insight-title">{{ insight.title }}</span>
          <div class="insight-meta">
            <span class="insight-type">{{ formatType(insight.insightType) }}</span>
            <span class="separator">•</span>
            <span class="insight-time">{{ formatDate(insight.createdAt) }}</span>
          </div>
        </div>
      </div>
      <div class="confidence-score" v-if="insight.confidence" :title="`Confidence: ${insight.confidence * 100}%`">
        <i class="ri-AI-generate"></i>
        <span>{{ Math.round(insight.confidence * 100) }}%</span>
      </div>
    </div>

    <div class="card-body">
      <div class="description">
        {{ insight.description }}
      </div>

      <div class="affected-entities" v-if="insight.affectedEntities && insight.affectedEntities.length > 0">
        <span class="entities-label">Affected:</span>
        <span v-for="entity in insight.affectedEntities" :key="entity.id" class="entity-badge">
          <i :class="getEntityIcon(entity.type)"></i>
          {{ entity.name || entity.id }}
        </span>
      </div>

      <div class="suggested-actions" v-if="insight.suggestedActions && insight.suggestedActions.length > 0">
        <div class="actions-label">Suggested Actions:</div>
        <div v-for="action in insight.suggestedActions" :key="action.label" class="action-item">
            <el-button size="small" type="primary" plain @click="$emit('execute-action', action)">
                {{ action.label }}
            </el-button>
        </div>
      </div>
    </div>

    <div class="card-footer" v-if="insight.status === 'active'">
      <el-button 
        type="text" 
        size="small" 
        class="dismiss-btn"
        @click="$emit('dismiss', insight.id)"
      >
        Dismiss
      </el-button>
      <div class="spacer"></div>
      <el-button 
        type="success" 
        size="small" 
        @click="$emit('resolve', insight.id)"
      >
        <i class="ri-check-line"></i> Mark Resolved
      </el-button>
    </div>
    </template>
  </div>
</template>

<script>
import moment from 'moment'

export default {
  name: 'InsightCard',
  props: {
    insight: {
      type: Object,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  emits: ['dismiss', 'resolve', 'execute-action'],
  setup() {
    const getSeverityIcon = (severity) => {
      const icons = {
        'critical': 'ri-alarm-warning-fill',
        'high': 'ri-error-warning-fill',
        'medium': 'ri-alert-fill',
        'low': 'ri-information-fill',
      }
      return icons[severity] || 'ri-information-line'
    }

    const getEntityIcon = (type) => {
      const icons = {
        'issue': 'ri-task-line',
        'project': 'ri-folder-line',
        'user': 'ri-user-line',
        'component': 'ri-layout-grid-line',
      }
      return icons[type] || 'ri-price-tag-3-line'
    }

    const formatType = (type) => {
      return type.charAt(0).toUpperCase() + type.slice(1)
    }

    const formatDate = (date) => {
      return moment(date).fromNow()
    }

    return {
      getSeverityIcon,
      getEntityIcon,
      formatType,
      formatDate
    }
  }
}
</script>

<style lang="scss" scoped>
.insight-card {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 12px;
  transition: all 0.2s ease;
  border-left: 4px solid transparent;

  &:hover {
    border-color: #3f3f46;
  }
  
  &.critical { border-left-color: #3f3f46; }
  &.high { border-left-color: #3f3f46; }
  &.medium { border-left-color: #3f3f46; }
  &.low { border-left-color: #3f3f46; }
}

.card-header {
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: #0a0a0a;
  border-bottom: 1px solid #27272a;
}

.header-left {
  display: flex;
  gap: 12px;
}

.severity-indicator {
  font-size: 20px;
  &.critical { color: #fff; }
  &.high { color: #fff; }
  &.medium { color: #fff; }
  &.low { color: #fff; }
}

.insight-info {
  display: flex;
  flex-direction: column;
}

.insight-title {
  font-weight: 600;
  font-size: 14px;
  color: #fff;
}

.insight-meta {
  font-size: 12px;
  color: #71717a;
  display: flex;
  gap: 6px;
  align-items: center;
}

.confidence-score {
    font-size: 12px;
    color: #71717a;
    display: flex;
    align-items: center;
    gap: 4px;
}

.card-body {
  padding: 16px;
}

.description {
  font-size: 14px;
  color: #d4d4d8;
  margin-bottom: 16px;
  line-height: 1.5;
}

.affected-entities {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  margin-bottom: 16px;
}

.entities-label { color: #71717a; }

.entity-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #27272a;
  padding: 3px 8px;
  border-radius: 4px;
  color: #e4e4e7;
  i { color: #3b82f6; }
}

.suggested-actions {
    .actions-label {
        font-size: 12px;
        color: #71717a;
        margin-bottom: 8px;
    }
    .action-item {
        display: inline-block;
        margin-right: 8px;
        margin-bottom: 8px;
    }
}

.card-footer {
  padding: 10px 16px;
  border-top: 1px solid #27272a;
  display: flex;
  align-items: center;
  
  .spacer { flex: 1; }

  .dismiss-btn {
      color: #71717a;
      &:hover { color: #d4d4d8; }
  }
}
</style>
