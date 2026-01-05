<template>
  <div class="backlog-page devspace-page">
    <!-- Bulk Actions Toolbar -->
    <div class="bulk-actions" v-if="selectedIssues.length > 0">
      <div class="selected-count">{{ selectedIssues.length }} selected</div>
      <el-divider direction="vertical" />
      <el-select 
        v-model="bulkStatus" 
        placeholder="Set Status" 
        size="small" 
        style="width: 140px"
        @change="handleBulkStatusUpdate"
      >
        <el-option label="Backlog" value="backlog" />
        <el-option label="To Do" value="todo" />
        <el-option label="In Progress" value="in_progress" />
        <el-option label="Review" value="review" />
        <el-option label="Done" value="done" />
      </el-select>

      <el-select 
        v-model="bulkPriority" 
        placeholder="Set Priority" 
        size="small" 
        style="width: 140px"
        @change="handleBulkPriorityUpdate"
      >
        <el-option label="Urgent" value="urgent" />
        <el-option label="High" value="high" />
        <el-option label="Medium" value="medium" />
        <el-option label="Low" value="low" />
      </el-select>

      <el-button type="danger" size="small" plain @click="handleBulkDelete">
        <i class="ri-delete-bin-line"></i>
        Delete
      </el-button>
    </div>

    <!-- Quick Create -->
    <div class="quick-create">
      <el-input
        v-model="quickCreateTitle"
        placeholder="Create new issue..."
        @keyup.enter="handleQuickCreate"
        :disabled="isCreating"
      >
        <template #prefix>
            <i class="ri-add-line"></i>
        </template>
      </el-input>
    </div>

    <!-- Loading State -->
    <table-skeleton v-if="isLoading" />

    <!-- Empty State -->
    <empty-state
      v-else-if="!isLoading && filteredIssues.length === 0"
      icon="ri-file-list-3-line"
      title="No issues in backlog"
      description="Start by creating your first issue. Use the quick create input above or click the button below."
      action-text="Create Issue"
      @action="$emit('create-issue')"
    />

    <!-- Issues Table -->
    <div v-else class="backlog-content">
      <el-table 
        :data="filteredIssues" 
        v-loading="isLoading" 
        style="width: 100%"
        @selection-change="handleSelectionChange"
        @row-click="handleRowClick"
        row-key="id"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="100" sortable>
          <template #default="{ row }">
            <span class="issue-id">#{{ row.id?.slice(0, 8) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="Title" min-width="200" sortable />
        <el-table-column prop="status" label="Status" width="120" sortable>
          <template #default="{ row }">
            <el-tag size="small">{{ formatStatus(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="Priority" width="100" sortable>
          <template #default="{ row }">
            <span :class="['priority-badge', `priority-${row.priority}`]">
              {{ row.priority }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="estimatedHours" label="Est. Hours" width="110" sortable>
             <template #default="{ row }">
                <div @click.stop class="editable-cell">
                    <el-input-number 
                        v-if="editingId === row.id + '_hours'"
                        v-model="row.estimatedHours" 
                        size="small" 
                        :min="0"
                        :precision="1"
                        :controls="false"
                        @blur="saveInlineEdit(row, 'estimatedHours')"
                        @keyup.enter="saveInlineEdit(row, 'estimatedHours')"
                        ref="hoursInput"
                    />
                    <span v-else @click="startInlineEdit(row, 'hours')">
                        {{ row.estimatedHours || '-' }}
                    </span>
                </div>
            </template>
        </el-table-column>
        <el-table-column prop="assignee" label="Assignee" width="180">
          <template #default="{ row }">
            <div class="assignee-cell" @click.stop>
                 <el-popover
                    trigger="click"
                    placement="bottom-start"
                    :width="220"
                 >
                    <template #reference>
                        <div class="assignee-trigger">
                             <template v-if="row.assignee || row.assigneeMember">
                                <el-avatar :size="20" :src="row.assignee?.avatarUrl || row.assigneeMember?.attributes?.avatarUrl?.default">
                                    {{ (row.assignee?.fullName || row.assigneeMember?.displayName)?.[0] || 'U' }}
                                </el-avatar>
                                <span class="assignee-name">
                                    {{ row.assignee?.fullName || row.assignee?.email || row.assigneeMember?.displayName || row.assigneeMember?.emails?.[0] }}
                                </span>
                                <el-tag v-if="row.assigneeMember && !row.assignee" size="small" type="info" class="not-joined-tag">Not joined</el-tag>
                             </template>
                             <span class="unassigned" v-else>Unassigned</span>
                        </div>
                    </template>
                    <div class="assignee-select-list">
                        <div 
                            v-for="member in teamMembers" 
                            :key="member.id"
                            class="member-option"
                            @click="updateAssignee(row, member)"
                        >
                             <el-avatar :size="20" :src="member.avatarUrl" style="margin-right: 8px;">
                                {{ member.name?.[0] || 'U' }}
                              </el-avatar>
                              <span>{{ member.name }}</span>
                              <el-tag v-if="!member.hasJoined" size="small" type="info" style="margin-left: 8px;">Not joined</el-tag>
                        </div>
                        <div v-if="teamMembers.length === 0" class="no-members-hint">
                            No team members found. Add team members in the Team page.
                        </div>
                    </div>
                 </el-popover>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Issue Detail Drawer -->
    <el-drawer
      v-model="showIssuePanel"
      :title="'Issue Details'"
      size="600px"
      @close="clearSelectedIssue"
      class="issue-drawer"
      :close-on-click-modal="true"
    >
      <div v-if="selectedIssueId" class="drawer-content">
          <issue-detail-panel :issue-id="selectedIssueId" />
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElNotification, ElMessageBox } from 'element-plus';
import { devtelSocket } from '../services/devtel-socket';
import { useProject } from '@/modules/devspace/composables/useProject';
import DevtelService from '@/modules/devspace/services/devtel-api';
import IssueDetailPanel from '@/modules/devspace/components/IssueDetailPanel.vue';
import TableSkeleton from '@/modules/devspace/components/skeletons/TableSkeleton.vue';
import EmptyState from '@/modules/devspace/components/EmptyState.vue';

const store = useStore();
const { activeProjectId, hasActiveProject } = useProject();

    const issues = computed(() => store.getters['issues/issues']);
    const isLoading = computed(() => store.getters['issues/isLoading']);

    // State
    const selectedIssues = ref([]);
    const bulkStatus = ref('');
    const bulkPriority = ref('');
    const showIssuePanel = ref(false);
    const selectedIssueId = ref(null);
    const quickCreateTitle = ref('');
    const isCreating = ref(false);
    const editingId = ref(null);

    const teamMembers = computed(() => store.getters['devspace/teamMembers']);
    // Only users (not contacts) can be assigned to issues
    const assignableMembers = computed(() => teamMembers.value.filter(m => m.isUser !== false));

    // Initial simple filtering (can be expanded)
    const filteredIssues = computed(() => issues.value);

    // Table Handlers
    const handleSelectionChange = (val) => {
      selectedIssues.value = val;
    };

    const handleRowClick = (row) => {
      // Don't open if editing inline
      if (editingId.value) return;
      selectedIssueId.value = row.id;
      store.dispatch('issues/selectIssue', row.id);
      showIssuePanel.value = true;
    };

    const clearSelectedIssue = () => {
      showIssuePanel.value = false;
      selectedIssueId.value = null;
      store.dispatch('issues/clearSelectedIssue');
    };

    const formatStatus = (status) => {
      return status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    // Quick Create
    const handleQuickCreate = async () => {
        if (!quickCreateTitle.value.trim()) return;
        isCreating.value = true;
        try {
            await DevtelService.createIssue(activeProjectId.value, {
                title: quickCreateTitle.value,
                status: 'backlog',
                priority: 'medium',
                projectId: activeProjectId.value
            });
            quickCreateTitle.value = '';
            ElMessage.success('Issue created');
            await refreshData();
        } catch (error) {
            console.error('Failed to create issue:', error);
            
            // Provide more specific error messages
            if (error.response?.status === 404) {
                ElMessage.error('Issue creation service not available. Please check your tenant configuration.');
            } else if (error.message?.includes('tenant context')) {
                ElMessage.error('Please ensure you are logged in and have selected a workspace.');
            } else {
                ElMessage.error('Failed to create issue');
            }
        } finally {
            isCreating.value = false;
        }
    };

    // Inline Updating
    const startInlineEdit = (row, field) => {
        editingId.value = row.id + '_' + field;
        // Focus logic could go here
    };

    const saveInlineEdit = async (row, field) => {
        editingId.value = null;
        try {
            await store.dispatch('issues/updateIssue', {
                issueId: row.id,
                data: { [field]: row[field] }
            });
             ElMessage.success('Updated');
        } catch (e) {
             ElMessage.error('Update failed');
             await refreshData();
        }
    };

    const updateAssignee = async (row, member) => {
         try {
            // Use assigneeId for users, assigneeMemberId for contacts who haven't joined
            const data = member.hasJoined 
                ? { assigneeId: member.userId, assigneeMemberId: null }
                : { assigneeMemberId: member.memberId, assigneeId: null };
            
            await store.dispatch('issues/updateIssue', {
                issueId: row.id,
                data
            });
             ElMessage.success('Assignee updated');
        } catch (e) {
             ElMessage.error('Failed to update assignee');
        }
    };

    // Bulk Actions
    const handleBulkStatusUpdate = async (newStatus) => {
      if (!selectedIssues.value.length || !newStatus) return;
      
      const ids = selectedIssues.value.map(i => i.id);
      try {
        await DevtelService.bulkUpdateIssues(activeProjectId.value, ids, { status: newStatus });
        ElMessage.success(`Updated ${ids.length} issues`);
        bulkStatus.value = '';
        await refreshData();
      } catch (e) {
        ElMessage.error('Failed to update issues');
      }
    };

    const handleBulkPriorityUpdate = async (newPriority) => {
      if (!selectedIssues.value.length || !newPriority) return;

      const ids = selectedIssues.value.map(i => i.id);
      try {
        await DevtelService.bulkUpdateIssues(activeProjectId.value, ids, { priority: newPriority });
        ElMessage.success(`Updated ${ids.length} issues`);
        bulkPriority.value = '';
        await refreshData();
      } catch (e) {
        ElMessage.error('Failed to update issues');
      }
    };

    const handleBulkDelete = () => {
      if (!selectedIssues.value.length) return;
      const ids = selectedIssues.value.map(i => i.id);
      
      ElMessageBox.confirm(
        `Are you sure you want to delete ${ids.length} issues?`,
        'Warning',
        {
          confirmButtonText: 'Delete',
          cancelButtonText: 'Cancel',
          type: 'warning',
        }
      ).then(async () => {
        try {
           await Promise.all(ids.map(id => DevtelService.deleteIssue(activeProjectId.value, id)));
           
           ElMessage.success('Issues deleted');
           selectedIssues.value = [];
           await refreshData();
        } catch (e) {
          ElMessage.error('Failed to delete issues');
        }
      });
    };

    const refreshData = async () => {
       await store.dispatch('issues/fetchIssues', activeProjectId.value);
       await store.dispatch('devspace/fetchTeamMembers');
    };

    // Load data
    onMounted(async () => {
      if (hasActiveProject.value) {
        await refreshData();
      }
      
      // Setup Socket.IO event listeners
      setupSocketListeners();
    });
    
    onUnmounted(() => {
      // Remove Socket.IO event listeners
      devtelSocket.off('issue:created', handleIssueCreated);
      devtelSocket.off('issue:updated', handleIssueUpdated);
      devtelSocket.off('issue:deleted', handleIssueDeleted);
    });
    
    // Socket.IO Event Handlers
    const handleIssueCreated = (issue) => {
      store.commit('issues/ADD_ISSUE', issue);
      ElNotification({
        title: 'New Issue',
        message: `Issue ${issue.key} created`,
        type: 'info',
        duration: 3000,
      });
    };
    
    const handleIssueUpdated = (issue) => {
      store.commit('issues/UPDATE_ISSUE', issue);
      ElNotification({
        title: 'Issue Updated',
        message: `Issue ${issue.key} was updated`,
        type: 'info',
        duration: 2000,
      });
    };
    
    const handleIssueDeleted = ({ id }) => {
      store.commit('issues/REMOVE_ISSUE', id);
      ElNotification({
        title: 'Issue Deleted',
        message: 'An issue was deleted',
        type: 'warning',
        duration: 2000,
      });
    };
    
const setupSocketListeners = () => {
  devtelSocket.on('issue:created', handleIssueCreated);
  devtelSocket.on('issue:updated', handleIssueUpdated);
  devtelSocket.on('issue:deleted', handleIssueDeleted);
};
</script>

<style scoped>
@import '../styles/devspace-common.css';

.backlog-page {
  height: 100%;
}

.bulk-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  background-color: var(--el-fill-color-light);
  padding: 8px 16px;
  border-radius: 4px;
  margin-bottom: 16px;
  border: 1px solid var(--el-border-color-lighter);
}

.selected-count {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.issue-id {
  font-family: monospace;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.priority-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  font-weight: 600;
  border: 1px solid transparent;
}

.priority-urgent { 
  background-color: rgba(239, 68, 68, 0.2); 
  color: #f87171; 
  border-color: rgba(239, 68, 68, 0.3);
}

.priority-high { 
  background-color: rgba(249, 115, 22, 0.2); 
  color: #fb923c;
  border-color: rgba(249, 115, 22, 0.3);
}

.priority-medium { 
  background-color: rgba(59, 130, 246, 0.2); 
  color: #60a5fa;
  border-color: rgba(59, 130, 246, 0.3);
}

.priority-low { 
  background-color: rgba(16, 185, 129, 0.2); 
  color: #34d399;
  border-color: rgba(16, 185, 129, 0.3);
}

.assignee-cell {
    display: flex;
    align-items: center;
    gap: 8px;
}

.assignee-name {
    font-size: 13px;
}

.unassigned {
  color: var(--el-text-color-placeholder);
  font-style: italic;
  font-size: 13px;
}

.quick-create {
    margin-bottom: 16px;
}

.assignee-trigger {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
}

.assignee-trigger:hover {
    background-color: var(--el-fill-color-light);
}

.not-joined-tag {
    margin-left: 6px;
    font-size: 10px;
}

.member-option {
    display: flex;
    align-items: center;
    padding: 8px;
    cursor: pointer;
    border-radius: 4px;
}

.member-option:hover {
    background-color: var(--el-fill-color-light);
}

.editable-cell {
    cursor: pointer;
}

.backlog-content {
    background: var(--el-bg-color);
    border-radius: 8px;
    border: 1px solid var(--el-border-color-light);
    overflow: hidden;
}

.drawer-content {
    height: 100%;
    padding: 20px;
    overflow-y: auto;
}

:deep(.issue-drawer .el-drawer__body) {
    padding: 0;
}

:deep(.issue-drawer .el-drawer) {
  border-left: 2px solid #3f3f46;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
}

:deep(.issue-drawer .el-drawer__header) {
  margin-bottom: 0;
  padding: 20px;
  border-bottom: 1px solid var(--el-border-color-light);
  font-size: 18px;
  font-weight: 600;
}

:deep(.issue-drawer .el-drawer__close-btn) {
  font-size: 24px;
  color: var(--el-text-color-secondary);
}

:deep(.issue-drawer .el-drawer__close-btn:hover) {
  color: var(--el-text-color-primary);
}
</style>
