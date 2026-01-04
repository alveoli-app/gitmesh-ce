<template>
  <div class="action-card" :class="proposal.status">
    <div class="card-header">
      <div class="header-left">
        <div class="action-icon">
          <i :class="getActionIcon(proposal.actionType)"></i>
        </div>
        <div class="action-info">
          <span class="action-type">{{ formatActionType(proposal.actionType) }}</span>
          <span class="action-status" :class="proposal.status">
            {{ proposal.status }}
          </span>
        </div>
      </div>
      <div class="confidence-score" v-if="proposal.confidenceScore" :title="`Confidence: ${proposal.confidenceScore * 100}%`">
        <i class="ri-shield-check-line"></i>
        <span>{{ Math.round(proposal.confidenceScore * 100) }}%</span>
      </div>
    </div>

    <div class="card-body">
      <div class="reasoning">
        {{ proposal.reasoning }}
      </div>

      <div class="parameters" v-if="Object.keys(proposal.parameters).length > 0">
        <div v-for="(value, key) in displayParameters" :key="key" class="param-row">
          <span class="param-key">{{ formatParamKey(key) }}:</span>
          <span class="param-value">{{ value }}</span>
        </div>
      </div>

      <div class="affected-entities" v-if="proposal.affectedEntities && proposal.affectedEntities.length > 0">
        <span class="entities-label">Affected:</span>
        <span v-for="entity in proposal.affectedEntities" :key="entity.id" class="entity-badge">
          <i :class="getEntityIcon(entity.type)"></i>
          {{ entity.name || entity.id }}
        </span>
      </div>
    </div>

    <div class="card-footer" v-if="proposal.status === 'pending'">
      <el-button 
        type="success" 
        size="small" 
        :loading="isProcessing"
        @click="$emit('approve', proposal.id)"
      >
        <i class="ri-check-line"></i> Approve
      </el-button>
      <el-button 
        type="danger" 
        size="small" 
        :loading="isProcessing"
        @click="$emit('reject', proposal.id)"
      >
        <i class="ri-close-line"></i> Reject
      </el-button>
      <el-button 
        size="small" 
        :loading="isProcessing"
        @click="$emit('modify', proposal)"
      >
        <i class="ri-edit-line"></i> Modify
      </el-button>
    </div>
    
    <div class="card-footer executed" v-else-if="proposal.status === 'approved'">
      <i class="ri-checkbox-circle-fill success-icon"></i>
      <span>Action executed successfully</span>
    </div>
    
    <div class="card-footer rejected" v-else-if="proposal.status === 'rejected'">
      <i class="ri-close-circle-fill error-icon"></i>
      <span>Action rejected</span>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'ActionCard',
  props: {
    proposal: {
      type: Object,
      required: true
    },
    isProcessing: {
      type: Boolean,
      default: false
    }
  },
  emits: ['approve', 'reject', 'modify'],
  setup(props) {
    const getActionIcon = (type) => {
      const icons = {
        'create_issue': 'ri-add-circle-line',
        'update_issue': 'ri-edit-line',
        'assign_issue': 'ri-user-add-line',
        'create_spec': 'ri-file-add-line',
        'update_spec': 'ri-file-edit-line',
      }
      return icons[type] || 'ri-flashlight-line'
    }

    const getEntityIcon = (type) => {
      const icons = {
        'issue': 'ri-task-line',
        'project': 'ri-folder-line',
        'user': 'ri-user-line',
        'spec': 'ri-file-list-line',
      }
      return icons[type] || 'ri-price-tag-3-line'
    }

    const formatActionType = (type) => {
      return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    }

    const formatParamKey = (key) => {
      return key.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase())
    }

    const displayParameters = computed(() => {
      const params = { ...props.proposal.parameters }
      // Filter out internal IDs if name is available or if redundant
      delete params.projectId
      delete params.issueId
      // Keep title, description, etc.
      return params
    })

    return {
      getActionIcon,
      getEntityIcon,
      formatActionType,
      formatParamKey,
      displayParameters,
    }
  }
}
</script>

<style lang="scss" scoped>
.action-card {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 8px;
  overflow: hidden;
  margin: 8px 0;
  max-width: 500px;
  transition: all 0.2s ease;

  &:hover {
    border-color: #3f3f46;
  }
  
  &.approved {
    border-color: #27272a;
    .action-status { color: #fff; background: #27272a; }
  }
  
  &.rejected {
    border-color: #27272a;
    .action-status { color: #a1a1aa; background: #27272a; }
  }
}

.card-header {
  padding: 12px 16px;
  border-bottom: 1px solid #27272a;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #0a0a0a;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: #27272a;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.action-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.action-type {
  font-weight: 600;
  font-size: 14px;
  color: #fff;
}

.action-status {
  font-size: 11px;
  text-transform: uppercase;
  font-weight: 600;
  color: #fff;
  background: #27272a;
  padding: 2px 6px;
  border-radius: 4px;
  align-self: flex-start;
}

.confidence-score {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #71717a;
  font-size: 12px;
  
  i { color: #3b82f6; }
}

.card-body {
  padding: 16px;
}

.reasoning {
  font-size: 14px;
  color: #d4d4d8;
  margin-bottom: 12px;
  line-height: 1.5;
}

.parameters {
  background: #000;
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 12px;
  border: 1px solid #27272a;
}

.param-row {
  display: flex;
  font-size: 13px;
  margin-bottom: 4px;
  
  &:last-child { margin-bottom: 0; }
}

.param-key {
  color: #71717a;
  width: 100px;
  flex-shrink: 0;
}

.param-value {
  color: #fff;
  font-family: monospace;
}

.affected-entities {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.entities-label {
  color: #71717a;
}

.entity-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #27272a;
  padding: 4px 8px;
  border-radius: 4px;
  color: #e4e4e7;
  
  i { color: #3b82f6; }
}

.card-footer {
  padding: 12px 16px;
  border-top: 1px solid #27272a;
  display: flex;
  gap: 8px;
  
  &.executed {
    background: #27272a;
    color: #fff;
    justify-content: center;
    align-items: center;
    
    .success-icon { color: #fff; margin-right: 8px; }
  }
  
  &.rejected {
    background: #27272a;
    color: #a1a1aa;
    justify-content: center;
    align-items: center;
    
    .error-icon { color: #a1a1aa; margin-right: 8px; }
  }
}
</style>
