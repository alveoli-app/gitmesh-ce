<template>
  <div class="board-page devspace-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-left">
        <span class="issue-count" v-if="total > 0">{{ total }} issues</span>
      </div>
      <div class="header-right">
        <el-input
          v-model="searchQuery"
          placeholder="Search issues..."
          prefix-icon="Search"
          clearable
          size="small"
          style="width: 200px"
          @input="debouncedSearch"
        />
        <el-button 
          size="small" 
          @click="showFilters = !showFilters"
          class="filter-toggle-btn"
          :type="showFilters ? 'primary' : 'default'"
        >
          <i class="ri-filter-3-line"></i>
          Filters
        </el-button>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="filter-bar" v-if="showFilters">
      <el-select
        v-model="filters.assigneeIds"
        multiple
        placeholder="Assignee"
        size="small"
        clearable
        collapse-tags
        style="width: 180px"
        @change="applyFilters"
      >
        <el-option
          v-for="member in assignableMembers"
          :key="member.id"
          :label="member.name"
          :value="member.id"
        >
            <span style="float: left">{{ member.name }}</span>
            <span
              style="
                float: right;
                color: var(--el-text-color-secondary);
                font-size: 13px;
              "
              >{{ member.email }}</span
            >
        </el-option>
      </el-select>

      <el-select
        v-model="filters.priority"
        multiple
        placeholder="Priority"
        size="small"
        clearable
        style="width: 140px"
        @change="applyFilters"
      >
        <el-option label="Urgent" value="urgent" />
        <el-option label="High" value="high" />
        <el-option label="Medium" value="medium" />
        <el-option label="Low" value="low" />
      </el-select>
      
      <el-select
        v-model="filters.cycleId"
        placeholder="Cycle"
        size="small"
        clearable
        style="width: 160px"
        @change="applyFilters"
      >
        <el-option
          v-for="cycle in cycles"
          :key="cycle.id"
          :label="cycle.name"
          :value="cycle.id"
        />
        <el-option label="No Cycle" value="none" />
      </el-select>
      
      <el-button size="small" @click="resetFilters" v-if="hasActiveFilters">
        Clear filters
      </el-button>
    </div>

    <div class="kanban-board" :class="{ 'kanban-board-empty': !isLoading && (total === 0 || !hasAnyIssues) }">
      <!-- Debug info (remove in production) -->
      <!-- Debug: isLoading={{ isLoading }}, total={{ total }}, hasAnyIssues={{ hasAnyIssues }} -->
      
      <!-- Loading State -->
      <board-skeleton v-if="isLoading" />

      <!-- Empty State -->
      <empty-state
        v-else-if="!isLoading && (total === 0 || !hasAnyIssues)"
        icon="ri-kanban-view-line"
        title="No issues yet"
        description="Create your first issue to start tracking work on this project. Issues help you organize and prioritize your team's work."
      />

      <!-- Board Content -->
      <template v-else-if="!isLoading && total > 0 && hasAnyIssues">
        <div
          v-for="column in columns"
          :key="column.id"
          class="kanban-column"
        >
          <div class="column-header">
            <span class="column-title">{{ column.label }}</span>
            <span class="column-count">{{ getColumnIssues(column.id).length }}</span>
          </div>
          
          <draggable
            :list="issuesByStatus[column.id]"
            class="column-content"
            group="issues"
            item-key="id"
            :animation="200"
            ghost-class="ghost-card"
            drag-class="drag-card"
            @change="(event) => onColumnChange(event, column.id)"
          >
            <template #item="{ element: issue }">
              <div
                class="issue-card"
                @click="selectIssue(issue)"
              >
                <div class="card-header">
                  <span class="issue-id">#{{ issue.id.slice(0, 8) }}</span>
                  <span :class="['priority-badge', `priority-${issue.priority}`]">
                    {{ issue.priority }}
                  </span>
                </div>
                <div class="card-title">{{ issue.title }}</div>
                <div class="card-footer">
                  <div class="assignee" v-if="issue.assignee || issue.assigneeMember">
                    <el-avatar :size="20" :src="issue.assignee?.avatarUrl || issue.assigneeMember?.attributes?.avatarUrl?.default">
                      {{ (issue.assignee?.fullName || issue.assigneeMember?.displayName)?.[0] || 'U' }}
                    </el-avatar>
                    <el-tag v-if="issue.assigneeMember && !issue.assignee" size="small" type="info" class="not-joined-badge">NJ</el-tag>
                  </div>
                  <div class="card-meta">
                    <span v-if="issue.estimatedHours" class="hours">
                      <i class="ri-time-line"></i>
                      {{ issue.estimatedHours }}h
                    </span>
                    <div v-if="issue.externalLinks?.length" class="external-links">
                      <a 
                        v-for="link in issue.externalLinks"
                        :key="link.id"
                        :href="link.url"
                        target="_blank"
                        class="link-icon"
                        @click.stop
                      >
                        <i :class="getLinkIcon(link.type)"></i>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </draggable>
        </div>
      </template>
    </div>

    <!-- Issue Detail Panel -->
    <el-drawer
      v-model="showIssuePanel"
      :title="'Issue Details'"
      size="600px"
      @close="clearSelectedIssue"
      class="issue-drawer"
      :close-on-click-modal="true"
    >
      <div v-if="selectedIssue" class="drawer-content">
          <issue-detail-panel :issue-id="selectedIssue.id" />
      </div>
    </el-drawer>
  </div>
</template>

<script>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';
import { useRoute } from 'vue-router';
import { ElMessage, ElNotification } from 'element-plus';
import { debounce } from 'lodash';
import { devtelSocket } from '../services/devtel-socket';
import DevtelService from '../services/devtel-api';
import draggable from 'vuedraggable';
import { useProject } from '@/modules/devspace/composables/useProject';
import IssueDetailPanel from '@/modules/devspace/components/IssueDetailPanel.vue';
import BoardSkeleton from '@/modules/devspace/components/skeletons/BoardSkeleton.vue';
import EmptyState from '@/modules/devspace/components/EmptyState.vue';

export default {
  name: 'BoardPage',
  components: { draggable, IssueDetailPanel, BoardSkeleton, EmptyState },

  setup() {
    const store = useStore();
    const { activeProjectId, hasActiveProject } = useProject();

    // Board columns
    const columns = [
      { id: 'backlog', label: 'Backlog' },
      { id: 'todo', label: 'To Do' },
      { id: 'in_progress', label: 'In Progress' },
      { id: 'review', label: 'Review' },
      { id: 'done', label: 'Done' },
    ];

    // State
    const showFilters = ref(false);
    const showIssuePanel = ref(false);
    const searchQuery = ref('');
    const filters = ref({
      priority: [],
      cycleId: null,
      assigneeIds: [],
    });

    // Track locally updating issues to prevent socket echo conflicts
    const locallyUpdatingIssues = ref(new Set());

    const hasAnyIssues = computed(() => {
      const statusCounts = Object.values(issuesByStatus.value || {});
      return statusCounts.some(issues => issues && issues.length > 0);
    });

    // Computed
    const isLoading = computed(() => store.getters['issues/isLoading']);
    const total = computed(() => store.getters['issues/total']);
    const issuesByStatus = computed(() => store.getters['issues/issuesByStatus']);
    const selectedIssue = computed(() => store.getters['issues/selectedIssue']);
    const cycles = computed(() => store.getters['cycles/cycles']);
    const teamMembers = computed(() => store.getters['devspace/teamMembers']);
    // Only users (not contacts) can be assigned to issues
    const assignableMembers = computed(() => teamMembers.value.filter(m => m.isUser !== false));
    const hasActiveFilters = computed(() => 
      filters.value.priority.length > 0 || filters.value.cycleId || filters.value.assigneeIds.length > 0
    );

    // Methods
    const getColumnIssues = (status) => issuesByStatus.value[status] || [];

    const getLinkIcon = (type) => {
        switch (type) {
            case 'github_pr': return 'ri-github-fill';
            case 'github_issue': return 'ri-github-line';
            case 'gitlab_mr': return 'ri-gitlab-fill';
            case 'figma': return 'ri-pen-nib-fill'; // Approx for Figma
            default: return 'ri-links-line';
        }
    };

    const onUpdateList = (newIssues, status) => {
        store.commit('issues/UPDATE_COLUMN_ISSUES', { status, issues: newIssues });
    };

    const onColumnChange = (event, status) => {
      // Handle when element is added to a column (drop)
      if (event.added) {
        const issue = event.added.element;
        
        // Mark as locally updating to ignore socket echo
        locallyUpdatingIssues.value.add(issue.id);
        setTimeout(() => locallyUpdatingIssues.value.delete(issue.id), 3000);
        
        // The issue status property is already updated by the UPDATE_COLUMN_ISSUES mutation
        // We just need to persist it to backend
        store.dispatch('issues/updateIssue', {
          issueId: issue.id,
          data: { status: status },
        }).catch(() => {
          ElMessage.error('Failed to move issue');
          // Reload to revert optimistic UI
          store.dispatch('issues/fetchIssues');
          locallyUpdatingIssues.value.delete(issue.id);
        });
      }
      
      // Handle reordering within column (moved)
      if (event.moved) {
        // Ideally send new order to backend
        // store.dispatch('issues/reorderIssue', ...)
      }
    };

    const applyFilters = () => {
      const filterParams = { ...filters.value };
      if (filterParams.cycleId === 'none') {
        filterParams.hasNoCycle = true;
        delete filterParams.cycleId;
      }
      store.dispatch('issues/setFilters', filterParams);
    };

    const resetFilters = () => {
      filters.value = { priority: [], cycleId: null, assigneeIds: [] };
      store.dispatch('issues/resetFilters');
    };

    const debouncedSearch = debounce(() => {
      store.dispatch('issues/setFilters', { search: searchQuery.value });
    }, 300);

    const selectIssue = async (issue) => {
      await store.dispatch('issues/selectIssue', issue.id);
      showIssuePanel.value = true;
    };

    const clearSelectedIssue = () => {
      store.dispatch('issues/clearSelectedIssue');
    };

    // Watch selected issue to show panel
    watch(selectedIssue, (issue) => {
      if (issue) {
        showIssuePanel.value = true;
      }
    });

    // Load data when mounted
    onMounted(async () => {
      if (hasActiveProject.value) {
        await Promise.all([
            store.dispatch('cycles/fetchCycles', activeProjectId.value),
            store.dispatch('issues/fetchIssues', activeProjectId.value),
            store.dispatch('devspace/fetchTeamMembers'),
        ]);
      }
      
      // Setup Socket.IO event listeners
      setupSocketListeners();
    });
    
    onUnmounted(() => {
      // Remove Socket.IO event listeners
      devtelSocket.off('issue:created', handleIssueCreated);
      devtelSocket.off('issue:updated', handleIssueUpdated);
      devtelSocket.off('issue:deleted', handleIssueDeleted);
      devtelSocket.off('issue:status-changed', handleIssueStatusChanged);
    });
    
    // Socket.IO Event Handlers
    const handleIssueCreated = (issue) => {
      // Only add if it's not from this user (check if we have it locally)
      if (!locallyUpdatingIssues.value.has(issue.id)) {
        store.commit('issues/ADD_ISSUE', issue);
        ElNotification({
          title: 'New Issue',
          message: `Issue ${issue.key} created`,
          type: 'info',
          duration: 3000,
        });
      }
    };
    
    const handleIssueUpdated = (issue) => {
      // Ignore if this is an echo of our own update
      if (locallyUpdatingIssues.value.has(issue.id)) {
        return;
      }
      
      store.commit('issues/UPDATE_ISSUE', issue);
      ElNotification({
        title: 'Issue Updated',
        message: `Issue ${issue.key} was updated`,
        type: 'info',
        duration: 2000,
      });
    };
    
    const handleIssueDeleted = ({ id }) => {
      if (!locallyUpdatingIssues.value.has(id)) {
        store.commit('issues/REMOVE_ISSUE', id);
        ElNotification({
          title: 'Issue Deleted',
          message: 'An issue was deleted',
          type: 'warning',
          duration: 2000,
        });
      }
    };
    
    const handleIssueStatusChanged = ({ issue, previousStatus, newStatus }) => {
      // Ignore if this is an echo of our own drag
      if (locallyUpdatingIssues.value.has(issue.id)) {
        return;
      }
      
      // Update issue in store
      store.commit('issues/UPDATE_ISSUE', issue);
      
      ElNotification({
        title: 'Issue Moved',
        message: `Issue ${issue.key} moved from ${previousStatus} to ${newStatus}`,
        type: 'info',
        duration: 2000,
      });
    };
    
    const setupSocketListeners = () => {
      devtelSocket.on('issue:created', handleIssueCreated);
      devtelSocket.on('issue:updated', handleIssueUpdated);
      devtelSocket.on('issue:deleted', handleIssueDeleted);
      devtelSocket.on('issue:status-changed', handleIssueStatusChanged);
    };

    return {
      columns,
      showFilters,
      showIssuePanel,
      searchQuery,
      filters,
      isLoading,
      total,
      hasAnyIssues,
      issuesByStatus,
      selectedIssue,
      cycles,
      teamMembers,
      assignableMembers,
      hasActiveFilters,
      hasActiveProject,
      getColumnIssues,
      onUpdateList,
      onColumnChange,
      applyFilters,
      resetFilters,
      debouncedSearch,
      selectIssue,
      clearSelectedIssue,
      getLinkIcon,
    };
  },
};
</script>

<style scoped>
@import '../styles/devspace-common.css';

.board-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.issue-count {
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-right .el-input {
  height: 32px;
}

.header-right .el-input .el-input__wrapper {
  height: 32px;
}

.filter-toggle-btn {
  height: 32px !important;
  min-height: 32px !important;
  padding: 0 15px !important;
  display: flex;
  align-items: center;
  gap: 4px;
  box-sizing: border-box;
}

.filter-toggle-btn i {
  font-size: 14px;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 16px 20px;
  background: linear-gradient(135deg, rgba(64, 64, 64, 0.1) 0%, rgba(32, 32, 32, 0.1) 100%);
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.kanban-board {
  flex: 1;
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 16px;
}

.kanban-board-empty {
  flex-direction: column !important;
  justify-content: center !important;
  align-items: center !important;
  gap: 0 !important;
  overflow-x: visible !important;
}

.kanban-board-empty .kanban-column {
  display: none !important;
}

.kanban-column {
  flex: 0 0 280px;
  display: flex;
  flex-direction: column;
  background-color: transparent; /* Clean look */
  border-radius: 8px;
  max-height: calc(100vh - 250px);
  border: 1px solid transparent; /* Reserve space or just implicit */
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 4px; /* Reduced padding since no bg */
  margin-bottom: 8px;
  border-bottom: 1px solid transparent; /* No underline for clean look */
}

.column-title {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.column-count {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  background-color: var(--el-fill-color);
  padding: 2px 8px;
  border-radius: 10px;
}

.column-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 4px; /* Align with header */
  min-height: 100px;
}

.column-empty {
  text-align: center;
  padding: 24px;
  color: var(--el-text-color-placeholder);
  font-size: 14px;
  border: 1px dashed var(--el-border-color-dark);
  border-radius: 8px;
}

.issue-card {
  background-color: #18181b; /* zinc-900 to pop against black */
  border: 1px solid #27272a; /* zinc-800 */
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.issue-card:hover {
  border-color: var(--el-color-primary);
  background-color: #27272a; /* Slightly lighter on hover */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.issue-card:active {
  cursor: grabbing;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.issue-id {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-family: monospace;
}

.priority-badge {
  font-size: 10px;
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

.card-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 12px;
  line-height: 1.4;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.external-links {
    display: flex;
    gap: 4px;
    margin-left: 4px;
}

.link-icon {
    color: var(--el-text-color-secondary);
    font-size: 14px;
    transition: color 0.2s;
}

.link-icon:hover {
    color: var(--el-color-primary);
}

.card-meta .hours {
  display: flex;
  align-items: center;
  gap: 4px;
}

.panel-section {
  margin-bottom: 20px;
}

.panel-section label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}

.comments-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--el-border-color-light);
}

.comments-list {
  margin-bottom: 12px;
}

.no-comments {
  text-align: center;
  padding: 24px;
  color: var(--el-text-color-placeholder);
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
