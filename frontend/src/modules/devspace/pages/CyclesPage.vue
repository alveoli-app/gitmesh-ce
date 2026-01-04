<template>
  <div class="cycles-page devspace-page">
    <div class="page-header">
      <h1>Cycles</h1>
      <el-button type="primary" size="small" @click="showCreateCycleModal = true">
        <i class="ri-add-line"></i>
        New Cycle
      </el-button>
    </div>
    
    <!-- Active Cycle -->
    <div class="active-cycle" v-if="activeCycle">
      <h2>Active Sprint</h2>
      <div class="cycle-card active">
        <div class="cycle-header">
          <h3>{{ activeCycle.name }}</h3>
          <el-tag type="success">Active</el-tag>
        </div>
        <p class="cycle-goal" v-if="activeCycle.goal">{{ activeCycle.goal }}</p>
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
        </div>
        <el-button size="small" @click="completeCycle(activeCycle.id)">
          Complete Sprint
        </el-button>
      </div>
    </div>
    
    <!-- Planned Cycles -->
    <div class="cycle-section">
      <h2>Planned</h2>
      <div class="cycles-grid">
        <div v-for="cycle in plannedCycles" :key="cycle.id" class="cycle-card">
          <div class="cycle-header">
            <h3>{{ cycle.name }}</h3>
            <el-tag>Planned</el-tag>
          </div>
          <p class="cycle-dates">
            {{ formatDate(cycle.startDate) }} - {{ formatDate(cycle.endDate) }}
          </p>
          <div class="cycle-actions">
            <el-button size="small" @click="openPlanning(cycle)">
              Plan Sprint
            </el-button>
            <el-button size="small" type="primary" @click="startCycle(cycle.id)">
              Start Sprint
            </el-button>
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
            <h3>{{ cycle.name }}</h3>
            <el-tag type="info">Completed</el-tag>
          </div>
          <div class="cycle-stats">
            <span>Velocity: {{ cycle.velocity || 0 }} issues</span>
            <span>Points: {{ cycle.storyPointsCompleted || 0 }}</span>
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
  </div>
</template>

<script>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElNotification } from 'element-plus';
import { devtelSocket } from '../services/devtel-socket';
import DevtelService from '../services/devtel-api';
import { format } from 'date-fns';
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
    const showPlanningModal = ref(false);
    const planningCycle = ref(null);
    const newCycle = ref({ name: '', goal: '', startDate: null, endDate: null });

    const activeCycle = computed(() => store.getters['cycles/activeCycle']);
    const plannedCycles = computed(() => store.getters['cycles/plannedCycles']);
    const completedCycles = computed(() => store.getters['cycles/completedCycles']);
    const burndownData = computed(() => store.getters['cycles/burndownData'] || []);
    const velocityData = computed(() => {
      return completedCycles.value.slice(0, 6).map(c => ({
        name: c.name,
        committed: c.storyPointsTotal || 0,
        completed: c.storyPointsCompleted || 0,
      })).reverse();
    });

    const formatDate = (date) => date ? format(new Date(date), 'MMM d, yyyy') : '';

    // Load cycles when mounted
    onMounted(async () => {
      if (hasActiveProject.value) {
        await store.dispatch('cycles/fetchCycles', activeProjectId.value);
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

    return {
      showCreateCycleModal,
      showPlanningModal,
      planningCycle,
      newCycle,
      activeCycle,
      plannedCycles,
      completedCycles,
      burndownData,
      velocityData,
      activeProjectId,
      formatDate,
      createCycle,
      startCycle,
      completeCycle,
      openPlanning,
      handlePlanSaved
    };
  },
};
</script>

<style scoped>
@import '../styles/devspace-common.css';

.cycles-page { height: 100%; overflow-y: auto; padding-right: 16px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h1 { font-size: 24px; font-weight: 600; margin: 0; }
.cycle-section { margin-bottom: 32px; }
.cycle-section h2 { font-size: 18px; font-weight: 500; margin-bottom: 16px; }
.cycles-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.cycle-card { background: var(--el-bg-color); border: 1px solid var(--el-border-color-light); border-radius: 8px; padding: 16px; }
.cycle-card.active { border-color: var(--el-color-success); background: rgba(16, 185, 129, 0.1); }
.cycle-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.cycle-header h3 { margin: 0; font-size: 16px; }
.cycle-goal { color: var(--el-text-color-secondary); margin-bottom: 12px; }
.cycle-dates { color: var(--el-text-color-secondary); font-size: 14px; margin-bottom: 12px; }
.cycle-actions { display: flex; gap: 8px; margin-top: 12px; }
.cycle-stats { display: flex; gap: 16px; margin-bottom: 12px; }
.stat { text-align: center; }
.stat-value { font-size: 24px; font-weight: 600; display: block; }
.stat-label { font-size: 12px; color: var(--el-text-color-secondary); }
.empty-state { color: var(--el-text-color-placeholder); padding: 24px; text-align: center; }
.charts-section { margin-top: 32px; padding-bottom: 40px; }
.charts-section h2 { font-size: 18px; font-weight: 500; margin-bottom: 16px; }
.charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; }
</style>
