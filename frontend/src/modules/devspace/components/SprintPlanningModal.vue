<template>
  <el-dialog
    v-model="visible"
    title="Sprint Planning"
    width="900px"
    class="sprint-planning-modal"
    :before-close="handleClose"
  >
    <div class="planning-container">
      <!-- Backlog Column -->
      <div class="planning-column">
        <div class="column-header">
          <h3>Backlog</h3>
          <span class="count">{{ backlogIssues.length }} issues</span>
        </div>
        <div class="column-content">
          <draggable
            v-model="backlogIssues"
            item-key="id"
            group="issues"
            class="issue-list"
            :animation="200"
            ghost-class="ghost-card"
          >
            <template #item="{ element }">
              <div class="planning-card">
                <div class="card-content">
                   <div class="card-title">{{ element.title }}</div>
                   <div class="card-meta">
                     <span class="id">#{{ element.id?.slice(0, 6) }}</span>
                     <span class="points" v-if="element.storyPoints || element.estimatedHours">
                        {{ parseFloat(element.storyPoints) || parseFloat(element.estimatedHours) || 0 }} pts
                     </span>
                     <span class="points no-points" v-else>0 pts</span>
                   </div>
                </div>
              </div>
            </template>
          </draggable>
        </div>
      </div>

      <!-- Arrow Divider -->
      <div class="divider">
        <i class="ri-arrow-right-line"></i>
      </div>

      <!-- Cycle Column -->
      <div class="planning-column cycle-column">
        <div class="column-header">
          <h3>{{ cycle?.name || 'Sprint' }}</h3>
          <div class="cycle-meta">
             <span class="count">{{ cycleIssues.length }} issues</span>
             <div class="capacity-editor">
                <span v-if="!isEditingCapacity" class="capacity" :class="{ 'over-capacity': capacity > 0 && totalPoints > capacity }" @click="isEditingCapacity = true">
                  {{ totalPoints }}{{ capacity > 0 ? ` / ${capacity}` : '' }} pts
                </span>
                <el-input-number 
                  v-else
                  v-model="capacity" 
                  size="small" 
                  :min="0"
                  :precision="1"
                  :controls="false"
                  @blur="saveCapacity"
                  @keyup.enter="saveCapacity"
                  placeholder="Set capacity"
                  style="width: 120px"
                />
             </div>
          </div>
        </div>
        <div class="column-content">
           <draggable
            v-model="cycleIssues"
            item-key="id"
            group="issues"
            class="issue-list cycle-list"
            :animation="200"
            ghost-class="ghost-card"
            @change="handleCycleChange"
          >
            <template #item="{ element }">
              <div class="planning-card">
                 <div class="card-content">
                   <div class="card-title">{{ element.title }}</div>
                   <div class="card-meta">
                     <span class="id">#{{ element.id?.slice(0, 6) }}</span>
                     <span class="points" v-if="element.storyPoints || element.estimatedHours">
                        {{ parseFloat(element.storyPoints) || parseFloat(element.estimatedHours) || 0 }} pts
                     </span>
                     <span class="points no-points" v-else>0 pts</span>
                   </div>
                </div>
              </div>
            </template>
          </draggable>
        </div>
      </div>
    </div>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">Cancel</el-button>
        <el-button type="primary" @click="savePlan" :loading="saving">
            Save Plan
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script>
import { computed, ref, watch, onMounted } from 'vue';
import draggable from 'vuedraggable';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import DevtelService from '@/modules/devspace/services/devtel-api';

export default {
  name: 'SprintPlanningModal',
  components: { draggable },
  props: {
    modelValue: { type: Boolean, default: false },
    cycle: { type: Object, default: null },
    projectId: { type: String, required: true }
  },
  emits: ['update:modelValue', 'saved'],
  setup(props, { emit }) {
    const store = useStore();
    const visible = computed({
      get: () => props.modelValue,
      set: (val) => emit('update:modelValue', val)
    });

    const backlogIssues = ref([]);
    const cycleIssues = ref([]);
    const saving = ref(false);
    const capacity = ref(0); // Dynamic capacity from cycle settings
    const updateTrigger = ref(0); // Force reactivity trigger
    const isEditingCapacity = ref(false);

    const totalPoints = computed(() => {
        // Access updateTrigger to force recomputation
        updateTrigger.value;
        
        console.log('[SprintPlanning] Computing total points for', cycleIssues.value.length, 'issues');
        const total = cycleIssues.value.reduce((sum, issue) => {
            const points = parseFloat(issue.storyPoints) || parseFloat(issue.estimatedHours) || 0;
            console.log('[SprintPlanning] Issue:', issue.title, 'Points:', points, 'storyPoints:', issue.storyPoints, 'estimatedHours:', issue.estimatedHours);
            return sum + points;
        }, 0);
        console.log('[SprintPlanning] Total calculated:', total);
        return Math.round(total * 10) / 10; // Round to 1 decimal place
    });
    
    const handleCycleChange = (event) => {
        console.log('[SprintPlanning] Cycle changed:', event);
        console.log('[SprintPlanning] Current cycle issues:', cycleIssues.value.length);
        // Force recomputation of totalPoints
        updateTrigger.value++;
    };
    
    // Watch for changes in cycleIssues
    watch(cycleIssues, (newVal) => {
        console.log('[SprintPlanning] Cycle issues changed:', newVal.length, 'issues');
        console.log('[SprintPlanning] Issues:', newVal.map(i => ({ title: i.title, points: i.storyPoints || i.estimatedHours })));
    }, { deep: true });

    const fetchData = async () => {
        try {
            console.log('[SprintPlanning] Fetching issues for project:', props.projectId);
            
            // Fetch all issues from the project
            const response = await DevtelService.listIssues(props.projectId, {});
            
            console.log('[SprintPlanning] Raw response:', response);
            
            // Handle different response formats
            let allIssues = [];
            if (Array.isArray(response)) {
                allIssues = response;
            } else if (response && response.rows) {
                allIssues = response.rows;
            } else if (response && response.data) {
                allIssues = Array.isArray(response.data) ? response.data : response.data.rows || [];
            }
            
            console.log('[SprintPlanning] All issues:', allIssues);
            console.log('[SprintPlanning] Sample issue:', allIssues[0]);
            
            // Separate into those already in this cycle and others
            if (props.cycle) {
                // Set capacity from cycle
                capacity.value = props.cycle.targetCapacity || 0;
                
                // Issues already assigned to this cycle
                cycleIssues.value = allIssues.filter(i => i.cycleId === props.cycle.id);
                
                // Backlog issues: includes issues with no cycle AND incomplete issues from other cycles
                // This allows carrying over unfinished work from previous sprints
                backlogIssues.value = allIssues.filter(i => 
                    (i.cycleId !== props.cycle.id) && 
                    (i.status !== 'done' || !i.cycleId)
                );
            } else {
                backlogIssues.value = allIssues.filter(i => 
                    !i.cycleId && (i.status === 'backlog' || i.status === 'todo')
                );
                cycleIssues.value = [];
            }
            
            console.log('[SprintPlanning] Backlog issues:', backlogIssues.value);
            console.log('[SprintPlanning] Cycle issues:', cycleIssues.value);
        } catch (e) {
            console.error('[SprintPlanning] Failed to load issues:', e);
            ElMessage.error('Failed to load issues for planning: ' + e.message);
        }
    };

    // Fetch data when modal opens
    watch(() => props.modelValue, async (val) => {
      if (val && props.cycle) {
        console.log('[SprintPlanning] Modal opened for cycle:', props.cycle);
        await fetchData();
      }
    }, { immediate: true });
    
    // Also fetch on mount if already open
    onMounted(async () => {
      if (props.modelValue && props.cycle) {
        console.log('[SprintPlanning] Modal mounted, fetching data');
        await fetchData();
      }
    });

    const handleClose = () => {
      visible.value = false;
    };

    const saveCapacity = async () => {
        isEditingCapacity.value = false;
        if (!props.cycle) return;
        
        try {
            await DevtelService.updateCycle(props.projectId, props.cycle.id, {
                targetCapacity: capacity.value
            });
            ElMessage.success('Capacity updated');
        } catch (e) {
            ElMessage.error('Failed to update capacity');
        }
    };

    const savePlan = async () => {
        if (!props.cycle) return;
        saving.value = true;
        try {
            const issueIds = cycleIssues.value.map(i => i.id);
            await DevtelService.planSprint(props.projectId, props.cycle.id, issueIds);
            ElMessage.success('Sprint plan saved');
            emit('saved');
            handleClose();
        } catch (e) {
            ElMessage.error('Failed to save plan');
        } finally {
            saving.value = false;
        }
    };

    return {
      visible,
      backlogIssues,
      cycleIssues,
      saving,
      capacity,
      totalPoints,
      isEditingCapacity,
      handleClose,
      savePlan,
      saveCapacity,
      handleCycleChange
    };
  }
};
</script>

<style scoped>
.planning-container {
    display: flex;
    align-items: stretch;
    height: 500px;
    gap: 16px;
}

.planning-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--el-border-color-light);
    border-radius: 8px;
    background: var(--el-bg-color-overlay);
    overflow: hidden;
}

.cycle-column {
    border-color: var(--el-color-primary-light-8);
    background: rgba(var(--el-color-primary-rgb), 0.02);
}

.column-header {
    padding: 12px 16px;
    border-bottom: 1px solid var(--el-border-color-light);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--el-fill-color-light);
}

.column-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
}

.count {
    font-size: 12px;
    color: var(--el-text-color-secondary);
}

.cycle-meta {
    display: flex;
    align-items: center;
    gap: 12px;
}

.capacity {
    font-size: 12px;
    font-weight: 600;
    color: var(--el-color-success);
    background: var(--el-color-success-light-9);
    padding: 2px 6px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
}

.capacity:hover {
    background: var(--el-color-success-light-8);
}

.capacity.over-capacity {
    color: var(--el-color-danger);
    background: var(--el-color-danger-light-9);
}

.capacity-editor {
    display: flex;
    align-items: center;
}

.column-content {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    min-height: 0; /* Allow flex child to shrink */
}

.issue-list {
    min-height: 100%;
    display: flex;
    flex-direction: column;
}

.planning-card {
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 6px;
    padding: 10px;
    margin-bottom: 8px;
    cursor: grab;
    transition: all 0.2s;
}

.planning-card:hover {
    border-color: var(--el-color-primary-light-5);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.ghost-card {
    opacity: 0.5;
    background: var(--el-color-primary-light-9);
    border: 1px dashed var(--el-color-primary);
}

.card-title {
    font-size: 13px;
    margin-bottom: 4px;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.card-meta {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--el-text-color-secondary);
}

.card-meta .no-points {
    color: var(--el-text-color-placeholder);
    font-style: italic;
}

.divider {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--el-text-color-placeholder);
    font-size: 24px;
}
</style>
