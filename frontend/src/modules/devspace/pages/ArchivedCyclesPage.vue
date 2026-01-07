<template>
  <div class="archived-cycles-page devspace-page">
    <div class="page-header">
      <div>
        <h1>Archived Cycles</h1>
        <p class="subtitle">Cycles are kept for 30 days before permanent deletion</p>
      </div>
      <el-button @click="$router.back()" size="small">
        <i class="ri-arrow-left-line"></i>
        Back
      </el-button>
    </div>

    <!-- Search and Filter Bar -->
    <div class="search-bar">
      <el-input
        v-model="searchQuery"
        placeholder="Search by name or goal..."
        clearable
        @input="debouncedSearch"
        @clear="loadArchivedCycles"
        class="search-input"
      >
        <template #prefix>
          <i class="ri-search-line"></i>
        </template>
      </el-input>
      <el-select
        v-model="sortOrder"
        placeholder="Sort by"
        @change="loadArchivedCycles"
        class="sort-select"
      >
        <el-option label="Recently Archived" value="recent" />
        <el-option label="Oldest First" value="oldest" />
        <el-option label="Deletes Soon" value="expiring" />
      </el-select>
      <el-button 
        @click="loadArchivedCycles" 
        :loading="isLoading"
        size="small"
      >
        <i class="ri-refresh-line"></i>
        Refresh
      </el-button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <el-skeleton :rows="3" animated />
    </div>

    <!-- Empty State -->
    <div v-else-if="archivedCycles.length === 0" class="empty-state">
      <i class="ri-inbox-line"></i>
      <h3>{{ searchQuery ? 'No Matching Cycles' : 'No Archived Cycles' }}</h3>
      <p v-if="searchQuery">Try adjusting your search terms</p>
      <p v-else>Deleted cycles will appear here for 30 days before permanent deletion</p>
    </div>

    <!-- Archived Cycles List -->
    <div v-else class="archived-list">
      <div class="list-header">
        <span class="count">{{ totalCount }} archived cycle{{ totalCount !== 1 ? 's' : '' }}</span>
      </div>
      
      <div v-for="cycle in sortedCycles" :key="cycle.id" class="archived-card">
        <div class="card-header">
          <div class="header-left">
            <h3>{{ cycle.name }}</h3>
            <el-tag type="warning" size="small">Archived</el-tag>
            <el-tag 
              v-if="getDaysRemaining(cycle.permanentDeleteAt) <= 7" 
              type="danger" 
              size="small"
            >
              Expiring Soon
            </el-tag>
          </div>
          <div class="header-right">
            <span class="delete-date" :class="{ urgent: getDaysRemaining(cycle.permanentDeleteAt) <= 7 }">
              <i class="ri-time-line"></i>
              Deletes {{ formatDeleteDate(cycle.permanentDeleteAt) }}
            </span>
          </div>
        </div>
        
        <p class="cycle-dates" v-if="cycle.startDate && cycle.endDate">
          <i class="ri-calendar-line"></i>
          {{ formatDate(cycle.startDate) }} - {{ formatDate(cycle.endDate) }}
        </p>
        
        <p class="cycle-goal" v-if="cycle.goal">{{ cycle.goal }}</p>

        <div class="cycle-meta" v-if="cycle.status">
          <el-tag size="small" :type="getStatusType(cycle.status)">
            {{ formatStatus(cycle.status) }}
          </el-tag>
          <span v-if="cycle.velocity" class="meta-item">
            <i class="ri-speed-line"></i> Velocity: {{ cycle.velocity }}
          </span>
          <span v-if="cycle.storyPointsCompleted" class="meta-item">
            <i class="ri-bar-chart-line"></i> {{ cycle.storyPointsCompleted }} pts completed
          </span>
        </div>
        
        <div class="card-footer">
          <span class="archived-date">
            <i class="ri-archive-line"></i>
            Archived {{ formatRelativeDate(cycle.archivedAt) }}
          </span>
          <div class="action-buttons">
            <el-button 
              type="primary" 
              size="small" 
              @click="restoreCycle(cycle)"
              :loading="restoringId === cycle.id"
            >
              <i class="ri-refresh-line"></i>
              Restore
            </el-button>
            <el-button 
              type="danger" 
              size="small" 
              plain
              @click="confirmPermanentDelete(cycle)"
              :loading="deletingId === cycle.id"
            >
              <i class="ri-delete-bin-line"></i>
              Delete Forever
            </el-button>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalCount > pageSize" class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="totalCount"
          layout="prev, pager, next"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- Permanent Delete Confirmation Dialog -->
    <el-dialog
      v-model="showDeleteDialog"
      title="Permanently Delete Cycle"
      width="450px"
      :close-on-click-modal="false"
    >
      <div class="delete-dialog-content">
        <div class="warning-icon">
          <i class="ri-error-warning-line"></i>
        </div>
        <p class="warning-text">
          Are you sure you want to permanently delete <strong>"{{ cycleToDelete?.name }}"</strong>?
        </p>
        <p class="warning-subtext">
          This action cannot be undone. The cycle and all associated data will be permanently removed.
        </p>
        <el-input
          v-model="deleteConfirmation"
          placeholder="Type DELETE to confirm"
          class="confirm-input"
        />
      </div>
      <template #footer>
        <el-button @click="cancelDelete">Cancel</el-button>
        <el-button 
          type="danger" 
          @click="permanentDeleteCycle"
          :disabled="deleteConfirmation !== 'DELETE'"
          :loading="deletingId === cycleToDelete?.id"
        >
          Delete Forever
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { format, formatDistanceToNow } from 'date-fns';
import DevtelService from '../services/devtel-api';
import { useProject } from '@/modules/devspace/composables/useProject';
import { debounce } from 'lodash';

export default {
  name: 'ArchivedCyclesPage',
  setup() {
    const router = useRouter();
    const { activeProjectId } = useProject();
    const archivedCycles = ref([]);
    const isLoading = ref(true);
    const searchQuery = ref('');
    const sortOrder = ref('recent');
    const currentPage = ref(1);
    const pageSize = 20;
    const totalCount = ref(0);
    
    // Action states
    const restoringId = ref(null);
    const deletingId = ref(null);
    const showDeleteDialog = ref(false);
    const cycleToDelete = ref(null);
    const deleteConfirmation = ref('');

    const formatDate = (date) => date ? format(new Date(date), 'MMM d, yyyy') : '';
    const formatRelativeDate = (date) => date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : '';
    
    const getDaysRemaining = (date) => {
      if (!date) return 30;
      const deleteDate = new Date(date);
      const now = new Date();
      return Math.ceil((deleteDate - now) / (1000 * 60 * 60 * 24));
    };

    const formatDeleteDate = (date) => {
      if (!date) return '';
      const daysLeft = getDaysRemaining(date);
      if (daysLeft <= 0) return 'today';
      if (daysLeft === 1) return 'tomorrow';
      return `in ${daysLeft} days`;
    };

    const formatStatus = (status) => {
      const statusMap = {
        'planned': 'Planned',
        'active': 'Active',
        'completed': 'Completed'
      };
      return statusMap[status] || status;
    };

    const getStatusType = (status) => {
      const typeMap = {
        'planned': '',
        'active': 'success',
        'completed': 'info'
      };
      return typeMap[status] || '';
    };

    const sortedCycles = computed(() => {
      const cycles = [...archivedCycles.value];
      switch (sortOrder.value) {
        case 'oldest':
          return cycles.sort((a, b) => new Date(a.archivedAt) - new Date(b.archivedAt));
        case 'expiring':
          return cycles.sort((a, b) => new Date(a.permanentDeleteAt) - new Date(b.permanentDeleteAt));
        case 'recent':
        default:
          return cycles.sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt));
      }
    });

    const loadArchivedCycles = async () => {
      isLoading.value = true;
      try {
        const params = {
          limit: pageSize,
          offset: (currentPage.value - 1) * pageSize,
        };
        if (searchQuery.value) {
          params.search = searchQuery.value;
        }
        const response = await DevtelService.listArchivedCycles(activeProjectId.value, params);
        archivedCycles.value = response.rows || response;
        totalCount.value = response.count || archivedCycles.value.length;
      } catch (error) {
        console.error('Failed to load archived cycles:', error);
        ElMessage.error('Failed to load archived cycles');
      } finally {
        isLoading.value = false;
      }
    };

    const debouncedSearch = debounce(() => {
      currentPage.value = 1;
      loadArchivedCycles();
    }, 300);

    const handlePageChange = (page) => {
      currentPage.value = page;
      loadArchivedCycles();
    };

    const restoreCycle = async (cycle) => {
      restoringId.value = cycle.id;
      try {
        await DevtelService.restoreCycle(activeProjectId.value, cycle.id);
        ElMessage.success(`"${cycle.name}" has been restored`);
        await loadArchivedCycles();
      } catch (error) {
        console.error('Failed to restore cycle:', error);
        ElMessage.error('Failed to restore cycle');
      } finally {
        restoringId.value = null;
      }
    };

    const confirmPermanentDelete = (cycle) => {
      cycleToDelete.value = cycle;
      deleteConfirmation.value = '';
      showDeleteDialog.value = true;
    };

    const cancelDelete = () => {
      showDeleteDialog.value = false;
      cycleToDelete.value = null;
      deleteConfirmation.value = '';
    };

    const permanentDeleteCycle = async () => {
      if (!cycleToDelete.value || deleteConfirmation.value !== 'DELETE') return;
      
      deletingId.value = cycleToDelete.value.id;
      try {
        await DevtelService.permanentDeleteCycle(activeProjectId.value, cycleToDelete.value.id);
        ElMessage.success(`"${cycleToDelete.value.name}" has been permanently deleted`);
        showDeleteDialog.value = false;
        cycleToDelete.value = null;
        deleteConfirmation.value = '';
        await loadArchivedCycles();
      } catch (error) {
        console.error('Failed to permanently delete cycle:', error);
        ElMessage.error('Failed to permanently delete cycle');
      } finally {
        deletingId.value = null;
      }
    };

    onMounted(() => {
      loadArchivedCycles();
    });

    return {
      archivedCycles,
      sortedCycles,
      isLoading,
      searchQuery,
      sortOrder,
      currentPage,
      pageSize,
      totalCount,
      restoringId,
      deletingId,
      showDeleteDialog,
      cycleToDelete,
      deleteConfirmation,
      formatDate,
      formatRelativeDate,
      formatDeleteDate,
      formatStatus,
      getStatusType,
      getDaysRemaining,
      loadArchivedCycles,
      debouncedSearch,
      handlePageChange,
      restoreCycle,
      confirmPermanentDelete,
      cancelDelete,
      permanentDeleteCycle
    };
  }
};
</script>

<style scoped>
@import '../styles/devspace-common.css';

.archived-cycles-page {
  height: 100%;
  overflow-y: auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.subtitle {
  color: var(--el-text-color-secondary);
  font-size: 14px;
  margin: 0;
}

.search-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  align-items: center;
}

.search-input {
  flex: 1;
  max-width: 400px;
}

.sort-select {
  width: 160px;
}

.loading-state {
  padding: 24px;
}

.empty-state {
  text-align: center;
  padding: 60px 24px;
  color: var(--el-text-color-secondary);
}

.empty-state i {
  font-size: 64px;
  color: var(--el-text-color-placeholder);
  margin-bottom: 16px;
}

.empty-state h3 {
  font-size: 18px;
  margin: 0 0 8px 0;
  color: var(--el-text-color-primary);
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

.archived-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 4px;
  margin-bottom: 8px;
}

.count {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.archived-card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 20px;
  transition: all 0.2s;
}

.archived-card:hover {
  border-color: var(--el-border-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.card-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
}

.delete-date {
  font-size: 13px;
  color: var(--el-color-warning);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}

.delete-date.urgent {
  color: var(--el-color-danger);
}

.cycle-dates {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.cycle-goal {
  color: var(--el-text-color-secondary);
  font-size: 14px;
  margin-bottom: 12px;
  line-height: 1.5;
}

.cycle-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.meta-item {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.archived-date {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 24px;
  padding-bottom: 24px;
}

/* Delete Dialog Styles */
.delete-dialog-content {
  text-align: center;
  padding: 16px 0;
}

.warning-icon {
  font-size: 48px;
  color: var(--el-color-danger);
  margin-bottom: 16px;
}

.warning-text {
  font-size: 16px;
  color: var(--el-text-color-primary);
  margin-bottom: 8px;
}

.warning-subtext {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin-bottom: 20px;
}

.confirm-input {
  max-width: 280px;
  margin: 0 auto;
}
</style>
