<template>
  <div class="cycles-page devspace-page">
    <div class="page-header">
      <h1>Cycles</h1>
      <div class="header-actions">
        <el-button size="small" @click="refreshCycles" :loading="isRefreshing">
          <i class="ri-refresh-line"></i>
          Refresh
        </el-button>
        <el-button size="small" @click="$router.push('/devspace/cycles/archived')">
          <i class="ri-inbox-archive-line"></i>
          View Archive
        </el-button>
        <el-button type="primary" size="small" @click="showCreateCycleModal = true">
          <i class="ri-add-line"></i>
          New Cycle
        </el-button>
      </div>
    </div>
    
    <!-- Active Cycle -->
    <div class="active-cycle-section" v-if="activeCycle">
      <h2>Active Sprint</h2>
      <div class="cycle-card active">
        <div class="cycle-header">
          <div class="header-left">
            <h3>{{ activeCycle.name }}</h3>
            <el-tag type="success" size="small">Active</el-tag>
          </div>
          <el-dropdown trigger="click" @command="handleCycleAction">
            <el-button size="small" text>
              <i class="ri-more-2-fill"></i>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item :command="{ action: 'edit', cycle: activeCycle }">
                  <i class="ri-edit-line"></i> Edit
                </el-dropdown-item>
                <el-dropdown-item :command="{ action: 'plan', cycle: activeCycle }">
                  <i class="ri-calendar-line"></i> Plan Sprint
                </el-dropdown-item>
                <el-dropdown-item :command="{ action: 'complete', cycle: activeCycle }">
                  <i class="ri-checkbox-circle-line"></i> Complete Sprint
                </el-dropdown-item>
                <el-dropdown-item divided :command="{ action: 'delete', cycle: activeCycle }">
                  <i class="ri-delete-bin-line"></i> Delete
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
        <p class="cycle-goal" v-if="activeCycle.goal">{{ activeCycle.goal }}</p>
        <p class="cycle-dates">
          {{ formatDate(activeCycle.startDate) }} - {{ formatDate(activeCycle.endDate) }}
        </p>
        <div class="cycle-stats">
          <div class="stat">
            <span class="stat-value">{{ activeCycle.stats?.totalIssues || 0 }}</span>
            <span class="stat-label">Total</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ activeCycle.stats?.completedIssues || 0 }}</span>
            <span class="stat-label">Done</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ activeCycle.stats?.inProgressIssues || 0 }}</span>
            <span class="stat-label">In Progress</span>
          </div>
          <div class="stat" v-if="activeCycle.targetCapacity">
            <span class="stat-value">{{ activeCycle.stats?.totalStoryPoints || 0 }} / {{ activeCycle.targetCapacity }}</span>
            <span class="stat-label">Capacity</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Planned Cycles -->
    <div class="cycle-section">
      <h2>Planned</h2>
      <div class="cycles-grid">
        <div v-for="cycle in plannedCycles" :key="cycle.id" class="cycle-card">
          <div class="cycle-header">
            <div class="header-left">
              <h3>{{ cycle.name }}</h3>
              <el-tag size="small">Planned</el-tag>
            </div>
            <el-dropdown trigger="click" @command="handleCycleAction">
              <el-button size="small" text>
                <i class="ri-more-2-fill"></i>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :command="{ action: 'edit', cycle }">
                    <i class="ri-edit-line"></i> Edit
                  </el-dropdown-item>
                  <el-dropdown-item :command="{ action: 'plan', cycle }">
                    <i class="ri-calendar-line"></i> Plan Sprint
                  </el-dropdown-item>
                  <el-dropdown-item :command="{ action: 'start', cycle }">
                    <i class="ri-play-circle-line"></i> Start Sprint
                  </el-dropdown-item>
                  <el-dropdown-item divided :command="{ action: 'delete', cycle }">
                    <i class="ri-delete-bin-line"></i> Delete
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
          <p class="cycle-goal" v-if="cycle.goal">{{ cycle.goal }}</p>
          <p class="cycle-dates">
            {{ formatDate(cycle.startDate) }} - {{ formatDate(cycle.endDate) }}
          </p>
          <div class="cycle-stats" v-if="cycle.stats">
            <span class="stat-item">{{ cycle.stats.totalIssues || 0 }} issues</span>
            <span class="stat-item" v-if="cycle.targetCapacity">{{ cycle.targetCapacity }} pts capacity</span>
          </div>
        </div>
        <div class="empty-state" v-if="plannedCycles.length === 0">
          No planned cycles
        </div>
      </div>
    </div>
    
    <!-- Completed Cycles -->
    <div class="cycle-section">
      <h2>Completed</h2>
      <div class="cycles-grid">
        <div v-for="cycle in completedCycles" :key="cycle.id" class="cycle-card completed">
          <div class="cycle-header">
            <div class="header-left">
              <h3>{{ cycle.name }}</h3>
              <el-tag type="info" size="small">Completed</el-tag>
            </div>
            <el-dropdown trigger="click" @command="handleCycleAction">
              <el-button size="small" text>
                <i class="ri-more-2-fill"></i>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :command="{ action: 'view', cycle }">
                    <i class="ri-eye-line"></i> View Details
                  </el-dropdown-item>
                  <el-dropdown-item divided :command="{ action: 'delete', cycle }">
                    <i class="ri-delete-bin-line"></i> Delete
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
          <p class="cycle-dates">
            {{ formatDate(cycle.startDate) }} - {{ formatDate(cycle.endDate) }}
          </p>
          <div class="cycle-stats">
            <span class="stat-item">Velocity: {{ cycle.velocity || 0 }} issues</span>
            <span class="stat-item">Points: {{ cycle.storyPointsCompleted || 0 }}</span>
          </div>
        </div>
        <div class="empty-state" v-if="completedCycles.length === 0">
          No completed cycles yet
        </div>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="charts-section" v-if="activeCycle || completedCycles.length">
      <h2>Analytics</h2>
      <div class="charts-grid">
        <BurndownChart 
          v-if="burndownData.length"
          title="Sprint Burndown" 
          :data="burndownData"
          :totalPoints="activeCycle?.storyPointsTotal || 0"
        />
        <VelocityChart 
          v-if="velocityData.length"
          title="Team Velocity" 
          :data="velocityData"
        />
      </div>
    </div>

    <!-- Create Cycle Modal -->
    <el-dialog v-model="showCreateCycleModal" title="Create Cycle" width="500px">
      <el-form :model="newCycle" label-position="top">
        <el-form-item label="Name" required>
          <el-input v-model="newCycle.name" placeholder="Sprint 1" />
        </el-form-item>
        <el-form-item label="Goal">
          <el-input v-model="newCycle.goal" type="textarea" placeholder="Sprint goal..." />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="Start Date">
              <el-date-picker v-model="newCycle.startDate" type="date" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="End Date">
              <el-date-picker v-model="newCycle.endDate" type="date" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="showCreateCycleModal = false">Cancel</el-button>
        <el-button type="primary" @click="createCycle">Create</el-button>
      </template>
    </el-dialog>

    <!-- Sprint Planning Modal -->
    <sprint-planning-modal
        v-if="planningCycle"
        v-model="showPlanningModal"
        :cycle="planningCycle"
        :project-id="activeProjectId"
        @saved="handlePlanSaved"
    />

    <!-- Edit Cycle Modal -->
    <el-dialog v-model="showEditCycleModal" title="Edit Cycle" width="500px">
      <el-form v-if="editingCycle" :model="editingCycle" label-position="top">
        <el-form-item label="Name" required>
          <el-input v-model="editingCycle.name" placeholder="Sprint 1" />
        </el-form-item>
        <el-form-item label="Goal">
          <el-input v-model="editingCycle.goal" type="textarea" placeholder="Sprint goal..." />
        </el-form-item>
        <el-form-item label="Target Capacity (Story Points)">
          <el-input-number v-model="editingCycle.targetCapacity" :min="0" :precision="1" style="width: 100%" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="Start Date">
              <el-date-picker v-model="editingCycle.startDate" type="date" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="End Date">
              <el-date-picker v-model="editingCycle.endDate" type="date" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="showEditCycleModal = false">Cancel</el-button>
        <el-button type="primary" @click="updateCycle" :loading="isUpdating">Save Changes</el-button>
      </template>
    </el-dialog>

    <!-- View Cycle Details Modal -->
    <el-dialog v-model="showViewCycleModal" :title="viewingCycle?.name" width="600px">
      <div v-if="viewingCycle" class="cycle-details">
        <div class="detail-section">
          <h4>Overview</h4>
          <div class="detail-row">
            <span class="label">Status:</span>
            <el-tag :type="getStatusType(viewingCycle.status)" size="small">
              {{ formatStatus(viewingCycle.status) }}
            </el-tag>
          </div>
          <div class="detail-row" v-if="viewingCycle.goal">
            <span class="label">Goal:</span>
            <span class="value">{{ viewingCycle.goal }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Duration:</span>
            <span class="value">{{ formatDate(viewingCycle.startDate) }} - {{ formatDate(viewingCycle.endDate) }}</span>
          </div>
          <div class="detail-row" v-if="viewingCycle.targetCapacity">
            <span class="label">Target Capacity:</span>
            <span class="value">{{ viewingCycle.targetCapacity }} points</span>
          </div>
        </div>

        <div class="detail-section" v-if="viewingCycle.stats">
          <h4>Statistics</h4>
          <div class="stats-grid">
            <div class="stat-box">
              <span class="stat-value">{{ viewingCycle.stats.totalIssues || 0 }}</span>
              <span class="stat-label">Total Issues</span>
            </div>
            <div class="stat-box">
              <span class="stat-value">{{ viewingCycle.stats.completedIssues || 0 }}</span>
              <span class="stat-label">Completed</span>
            </div>
            <div class="stat-box">
              <span class="stat-value">{{ viewingCycle.stats.inProgressIssues || 0 }}</span>
              <span class="stat-label">In Progress</span>
            </div>
            <div class="stat-box" v-if="viewingCycle.stats.totalStoryPoints">
              <span class="stat-value">{{ viewingCycle.stats.totalStoryPoints || 0 }}</span>
              <span class="stat-label">Story Points</span>
            </div>
          </div>
        </div>

        <div class="detail-section" v-if="viewingCycle.velocity || viewingCycle.storyPointsCompleted">
          <h4>Completion Metrics</h4>
          <div class="detail-row">
            <span class="label">Velocity:</span>
            <span class="value">{{ viewingCycle.velocity || 0 }} issues</span>
          </div>
          <div class="detail-row">
            <span class="label">Story Points Completed:</span>
            <span class="value">{{ viewingCycle.storyPointsCompleted || 0 }} points</span>
          </div>
        </div>

        <div class="detail-section">
          <h4>Timestamps</h4>
          <div class="detail-row">
            <span class="label">Created:</span>
            <span class="value">{{ formatDateTime(viewingCycle.createdAt) }}</span>
          </div>
          <div class="detail-row" v-if="viewingCycle.updatedAt">
            <span class="label">Last Updated:</span>
            <span class="value">{{ formatDateTime(viewingCycle.updatedAt) }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showViewCycleModal = false">Close</el-button>
        <el-button type="primary" @click="editCycle(viewingCycle)">Edit</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElNotification, ElMessageBox } from 'element-plus';
import { devtelSocket } from '../services/devtel-socket';
import DevtelService from '../services/devtel-api';
import { format, parseISO } from 'date-fns';
import { useProject } from '@/modules/devspace/composables/useProject';
import BurndownChart from '@/modules/devspace/components/BurndownChart.vue';
import VelocityChart from '@/modules/devspace/components/VelocityChart.vue';
import SprintPlanningModal from '@/modules/devspace/components/SprintPlanningModal.vue';

export default {
  name: 'CyclesPage',
  components: { BurndownChart, VelocityChart, SprintPlanningModal },
  setup() {
    const store = useStore();
    const { activeProjectId, hasActiveProject } = useProject();
    const showCreateCycleModal = ref(false);
    const showEditCycleModal = ref(false);
    const showViewCycleModal = ref(false);
    const showPlanningModal = ref(false);
    const planningCycle = ref(null);
    const editingCycle = ref(null);
    const viewingCycle = ref(null);
    const isUpdating = ref(false);
    const isRefreshing = ref(false);
    const newCycle = ref({ name: '', goal: '', startDate: null, endDate: null });

    const activeCycle = computed(() => store.getters['cycles/activeCycle']);
    const plannedCycles = computed(() => store.getters['cycles/plannedCycles']);
    const completedCycles = computed(() => store.getters['cycles/completedCycles']);
    const burndownData = computed(() => store.getters['cycles/burndownData'] || []);
    const velocityData = computed(() => {
      const data = completedCycles.value.slice(0, 6).map(c => {
        const committed = c.stats?.totalStoryPoints || c.targetCapacity || 0;
        const completed = c.storyPointsCompleted || c.stats?.completedStoryPoints || 0;
        
        console.log('[CyclesPage] Velocity data for', c.name, {
          committed,
          completed,
          stats: c.stats,
          storyPointsCompleted: c.storyPointsCompleted,
          targetCapacity: c.targetCapacity
        });
        
        return {
          name: c.name,
          committed,
          completed,
        };
      }).reverse();
      
      console.log('[CyclesPage] Final velocity data:', data);
      return data;
    });

    // Watch for modal close to reset state
    watch(showEditCycleModal, (newVal) => {
      if (!newVal) {
        editingCycle.value = null;
      }
    });

    watch(showViewCycleModal, (newVal) => {
      if (!newVal) {
        viewingCycle.value = null;
      }
    });

    const formatDate = (date) => date ? format(new Date(date), 'MMM d, yyyy') : '';
    const formatDateTime = (date) => date ? format(new Date(date), 'MMM d, yyyy h:mm a') : '';
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

    // Load cycles when mounted
    onMounted(async () => {
      if (hasActiveProject.value) {
        await store.dispatch('cycles/fetchCycles', activeProjectId.value);
        
        // Debug: Log active cycle data
        console.log('[CyclesPage] Active cycle:', activeCycle.value);
        if (activeCycle.value) {
          console.log('[CyclesPage] Active cycle stats:', activeCycle.value.stats);
        }
      }
      
      // Setup Socket.IO event listeners
      setupSocketListeners();
    });
    
    onUnmounted(() => {
      // Remove Socket.IO event listeners
      devtelSocket.off('cycle:created', handleCycleCreated);
      devtelSocket.off('cycle:updated', handleCycleUpdated);
      devtelSocket.off('cycle:started', handleCycleStarted);
      devtelSocket.off('cycle:completed', handleCycleCompleted);
    });
    
    // Socket.IO Event Handlers
    const handleCycleCreated = (cycle) => {
      store.commit('cycles/ADD_CYCLE', cycle);
      ElNotification({
        title: 'New Cycle',
        message: `Cycle "${cycle.name}" created`,
        type: 'info',
        duration: 3000,
      });
    };
    
    const handleCycleUpdated = (cycle) => {
      store.commit('cycles/UPDATE_CYCLE', cycle);
      ElNotification({
        title: 'Cycle Updated',
        message: `Cycle "${cycle.name}" was updated`,
        type: 'info',
        duration: 2000,
      });
    };
    
    const handleCycleStarted = (cycle) => {
      store.commit('cycles/UPDATE_CYCLE', cycle);
      ElNotification({
        title: 'Sprint Started',
        message: `Sprint "${cycle.name}" has started`,
        type: 'success',
        duration: 3000,
      });
    };
    
    const handleCycleCompleted = (cycle) => {
      store.commit('cycles/UPDATE_CYCLE', cycle);
      ElNotification({
        title: 'Sprint Completed',
        message: `Sprint "${cycle.name}" has been completed`,
        type: 'success',
        duration: 3000,
      });
    };
    
    const setupSocketListeners = () => {
      devtelSocket.on('cycle:created', handleCycleCreated);
      devtelSocket.on('cycle:updated', handleCycleUpdated);
      devtelSocket.on('cycle:started', handleCycleStarted);
      devtelSocket.on('cycle:completed', handleCycleCompleted);
    };

    const createCycle = async () => {
      try {
        await store.dispatch('cycles/createCycle', newCycle.value);
        showCreateCycleModal.value = false;
        newCycle.value = { name: '', goal: '', startDate: null, endDate: null };
        ElMessage.success('Cycle created');
      } catch (error) {
        ElMessage.error('Failed to create cycle');
      }
    };

    const startCycle = async (cycleId) => {
      try {
        await store.dispatch('cycles/startCycle', cycleId);
        ElMessage.success('Sprint started');
      } catch (error) {
        ElMessage.error('Failed to start sprint');
      }
    };

    const completeCycle = async (cycleId) => {
      try {
        await store.dispatch('cycles/completeCycle', cycleId);
        ElMessage.success('Sprint completed');
      } catch (error) {
        ElMessage.error('Failed to complete sprint');
      }
    };

    const openPlanning = (cycle) => {
        planningCycle.value = cycle;
        showPlanningModal.value = true;
    };

    const handlePlanSaved = async () => {
        // Refresh cycles to update stats
        await store.dispatch('cycles/fetchCycles', activeProjectId.value);
    };

    const handleCycleAction = async (command) => {
      const { action, cycle } = command;
      
      switch (action) {
        case 'edit':
          editCycle(cycle);
          break;
        case 'plan':
          openPlanning(cycle);
          break;
        case 'start':
          await startCycle(cycle.id);
          break;
        case 'complete':
          await completeCycle(cycle.id);
          break;
        case 'view':
          viewCycleDetails(cycle);
          break;
        case 'delete':
          await deleteCycle(cycle);
          break;
      }
    };

    const editCycle = (cycle) => {
      editingCycle.value = {
        id: cycle.id,
        name: cycle.name,
        goal: cycle.goal || '',
        startDate: cycle.startDate ? new Date(cycle.startDate) : null,
        endDate: cycle.endDate ? new Date(cycle.endDate) : null,
        targetCapacity: cycle.targetCapacity || 0
      };
      showViewCycleModal.value = false;
      showEditCycleModal.value = true;
    };

    const updateCycle = async () => {
      if (!editingCycle.value) return;
      
      isUpdating.value = true;
      try {
        await DevtelService.updateCycle(
          activeProjectId.value,
          editingCycle.value.id,
          {
            name: editingCycle.value.name,
            goal: editingCycle.value.goal,
            startDate: editingCycle.value.startDate,
            endDate: editingCycle.value.endDate,
            targetCapacity: editingCycle.value.targetCapacity
          }
        );
        
        await store.dispatch('cycles/fetchCycles', activeProjectId.value);
        showEditCycleModal.value = false;
        editingCycle.value = null;
        ElMessage.success('Cycle updated successfully');
      } catch (error) {
        console.error('Failed to update cycle:', error);
        ElMessage.error('Failed to update cycle');
      } finally {
        isUpdating.value = false;
      }
    };

    const viewCycleDetails = async (cycle) => {
      try {
        // Fetch full cycle details with stats
        const fullCycle = await DevtelService.getCycle(activeProjectId.value, cycle.id);
        viewingCycle.value = fullCycle;
        showViewCycleModal.value = true;
      } catch (error) {
        console.error('Failed to load cycle details:', error);
        ElMessage.error('Failed to load cycle details');
      }
    };

    const refreshCycles = async () => {
      isRefreshing.value = true;
      try {
        await store.dispatch('cycles/fetchCycles', activeProjectId.value);
        ElMessage.success('Cycles refreshed');
      } catch (error) {
        console.error('Failed to refresh cycles:', error);
        ElMessage.error('Failed to refresh cycles');
      } finally {
        isRefreshing.value = false;
      }
    };

    const deleteCycle = async (cycle) => {
      try {
        await ElMessageBox.confirm(
          `Are you sure you want to delete "${cycle.name}"? It will be archived for 30 days before permanent deletion.`,
          'Delete Cycle',
          {
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel',
            type: 'warning',
          }
        );
        
        await DevtelService.deleteCycle(activeProjectId.value, cycle.id);
        await store.dispatch('cycles/fetchCycles', activeProjectId.value);
        ElMessage.success('Cycle archived. It will be permanently deleted in 30 days.');
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('Failed to delete cycle');
        }
      }
    };

    return {
      showCreateCycleModal,
      showEditCycleModal,
      showViewCycleModal,
      showPlanningModal,
      planningCycle,
      editingCycle,
      viewingCycle,
      isUpdating,
      isRefreshing,
      newCycle,
      activeCycle,
      plannedCycles,
      completedCycles,
      burndownData,
      velocityData,
      activeProjectId,
      formatDate,
      formatDateTime,
      formatStatus,
      getStatusType,
      createCycle,
      startCycle,
      completeCycle,
      openPlanning,
      handlePlanSaved,
      handleCycleAction,
      deleteCycle,
      editCycle,
      updateCycle,
      viewCycleDetails,
      refreshCycles
    };
  },
};
</script>

<style scoped>
@import '../styles/devspace-common.css';

.cycles-page { 
  height: 100%; 
  overflow-y: auto; 
  padding-right: 16px; 
}

.page-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  margin-bottom: 24px; 
}

.page-header h1 { 
  font-size: 24px; 
  font-weight: 600; 
  margin: 0; 
}

.header-actions {
  display: flex;
  gap: 8px;
}

.active-cycle-section {
  margin-bottom: 32px;
}

.active-cycle-section h2 {
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 16px;
}

.cycle-section { 
  margin-bottom: 32px; 
}

.cycle-section h2 { 
  font-size: 18px; 
  font-weight: 500; 
  margin-bottom: 16px; 
}

.cycles-grid { 
  display: grid; 
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); 
  gap: 16px; 
}

.cycle-card { 
  background: var(--el-bg-color); 
  border: 1px solid var(--el-border-color-light); 
  border-radius: 8px; 
  padding: 20px;
  transition: all 0.2s;
}

.cycle-card:hover {
  border-color: var(--el-border-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.cycle-card.active { 
  border: 1px solid rgba(16, 185, 129, 0.3);
  background: linear-gradient(135deg, 
    rgba(16, 185, 129, 0.05) 0%, 
    rgba(16, 185, 129, 0.02) 50%,
    var(--el-bg-color) 100%
  );
  box-shadow: 0 2px 12px rgba(16, 185, 129, 0.1);
}

.cycle-card.active:hover {
  border-color: rgba(16, 185, 129, 0.4);
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.15);
}

.cycle-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: flex-start; 
  margin-bottom: 12px; 
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.cycle-header h3 { 
  margin: 0; 
  font-size: 16px;
  font-weight: 600;
}

.cycle-goal { 
  color: var(--el-text-color-secondary); 
  margin-bottom: 12px;
  font-size: 14px;
  line-height: 1.5;
}

.cycle-dates { 
  color: var(--el-text-color-secondary); 
  font-size: 13px; 
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.cycle-dates::before {
  content: '📅';
  font-size: 12px;
}

.cycle-actions { 
  display: flex; 
  gap: 8px; 
  margin-top: 12px; 
}

.cycle-stats { 
  display: flex; 
  gap: 20px; 
  margin-bottom: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.stat { 
  text-align: center;
  flex: 1;
}

.stat-value { 
  font-size: 24px; 
  font-weight: 600; 
  display: block;
  color: var(--el-text-color-primary);
}

.stat-label { 
  font-size: 12px; 
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-item {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-item::before {
  content: '•';
  color: var(--el-color-primary);
}

.empty-state { 
  color: var(--el-text-color-placeholder); 
  padding: 24px; 
  text-align: center;
  font-style: italic;
}

.charts-section { 
  margin-top: 32px; 
  padding-bottom: 40px; 
}

.charts-section h2 { 
  font-size: 18px; 
  font-weight: 500; 
  margin-bottom: 16px; 
}

.charts-grid { 
  display: grid; 
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); 
  gap: 20px; 
}

.cycle-card.completed {
  opacity: 0.9;
}

.cycle-card.completed:hover {
  opacity: 1;
}

/* Cycle Details Modal Styles */
.cycle-details {
  padding: 8px 0;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-section h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 12px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-row {
  display: flex;
  align-items: flex-start;
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row .label {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
  min-width: 140px;
  flex-shrink: 0;
}

.detail-row .value {
  font-size: 13px;
  color: var(--el-text-color-primary);
  flex: 1;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 16px;
  margin-top: 12px;
}

.stat-box {
  text-align: center;
  padding: 16px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
}

.stat-box .stat-value {
  display: block;
  font-size: 24px;
  font-weight: 600;
  color: var(--el-color-primary);
  margin-bottom: 4px;
}

.stat-box .stat-label {
  display: block;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
</style>
