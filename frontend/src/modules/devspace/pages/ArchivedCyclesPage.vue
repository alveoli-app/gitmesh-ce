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

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <el-skeleton :rows="3" animated />
    </div>

    <!-- Empty State -->
    <div v-else-if="archivedCycles.length === 0" class="empty-state">
      <i class="ri-inbox-line"></i>
      <h3>No Archived Cycles</h3>
      <p>Deleted cycles will appear here for 30 days before permanent deletion</p>
    </div>

    <!-- Archived Cycles List -->
    <div v-else class="archived-list">
      <div v-for="cycle in archivedCycles" :key="cycle.id" class="archived-card">
        <div class="card-header">
          <div class="header-left">
            <h3>{{ cycle.name }}</h3>
            <el-tag type="warning" size="small">Archived</el-tag>
          </div>
          <div class="header-right">
            <span class="delete-date">
              Deletes {{ formatDeleteDate(cycle.permanentDeleteAt) }}
            </span>
          </div>
        </div>
        
        <p class="cycle-dates" v-if="cycle.startDate && cycle.endDate">
          {{ formatDate(cycle.startDate) }} - {{ formatDate(cycle.endDate) }}
        </p>
        
        <p class="cycle-goal" v-if="cycle.goal">{{ cycle.goal }}</p>
        
        <div class="card-footer">
          <span class="archived-date">
            Archived {{ formatRelativeDate(cycle.archivedAt) }}
          </span>
          <el-button 
            type="primary" 
            size="small" 
            @click="restoreCycle(cycle)"
          >
            <i class="ri-refresh-line"></i>
            Restore
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { format, formatDistanceToNow } from 'date-fns';
import DevtelService from '../services/devtel-api';
import { useProject } from '@/modules/devspace/composables/useProject';

export default {
  name: 'ArchivedCyclesPage',
  setup() {
    const router = useRouter();
    const { activeProjectId } = useProject();
    const archivedCycles = ref([]);
    const isLoading = ref(true);

    const formatDate = (date) => date ? format(new Date(date), 'MMM d, yyyy') : '';
    const formatRelativeDate = (date) => date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : '';
    const formatDeleteDate = (date) => {
      if (!date) return '';
      const deleteDate = new Date(date);
      const now = new Date();
      const daysLeft = Math.ceil((deleteDate - now) / (1000 * 60 * 60 * 24));
      return `in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`;
    };

    const loadArchivedCycles = async () => {
      isLoading.value = true;
      try {
        const response = await DevtelService.listArchivedCycles(activeProjectId.value);
        archivedCycles.value = response.rows || response;
      } catch (error) {
        console.error('Failed to load archived cycles:', error);
        ElMessage.error('Failed to load archived cycles');
      } finally {
        isLoading.value = false;
      }
    };

    const restoreCycle = async (cycle) => {
      try {
        await DevtelService.restoreCycle(activeProjectId.value, cycle.id);
        ElMessage.success(`"${cycle.name}" has been restored`);
        await loadArchivedCycles();
      } catch (error) {
        console.error('Failed to restore cycle:', error);
        ElMessage.error('Failed to restore cycle');
      }
    };

    onMounted(() => {
      loadArchivedCycles();
    });

    return {
      archivedCycles,
      isLoading,
      formatDate,
      formatRelativeDate,
      formatDeleteDate,
      restoreCycle
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
}

.cycle-dates {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  margin-bottom: 8px;
}

.cycle-goal {
  color: var(--el-text-color-secondary);
  font-size: 14px;
  margin-bottom: 12px;
  line-height: 1.5;
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
}
</style>
