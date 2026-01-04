<template>
  <div class="actions-page">
    <header class="page-header">
      <h1>Actions & Audit</h1>
      <p class="subtitle">Review pending approvals, audit history, and compliance reports</p>
    </header>

    <el-tabs v-model="activeTab" class="actions-tabs">
      <!-- Pending Approvals Tab -->
      <el-tab-pane label="Pending Approvals" name="pending">
        <div class="pending-section">
          <div v-if="pendingLoading" class="loading-state">
            <el-skeleton :rows="3" count="3" animated />
          </div>
          <div v-else-if="pendingProposals.length > 0" class="proposals-grid">
            <ActionCard
              v-for="proposal in pendingProposals"
              :key="proposal.id"
              :proposal="proposal"
              :is-processing="processingId === proposal.id"
              @approve="approveProposal"
              @reject="rejectProposal"
              @modify="modifyProposal"
            />
          </div>
          <div v-else class="empty-state">
            <div class="empty-icon-container">
              <i class="ri-check-double-line"></i>
            </div>
            <h3>All Caught Up!</h3>
            <p class="empty-description">No pending approvals. AI actions that require your review will appear here.</p>
            <div class="empty-hint">
              <i class="ri-information-line"></i>
              Enable approval requirements in Agent settings
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- Action History Tab -->
      <el-tab-pane label="Action History" name="history">
        <!-- Filters -->
        <div class="filters-bar">
          <div class="filter-group">
            <el-select v-model="filters.status" placeholder="Status" clearable style="width: 140px">
              <el-option label="All Status" value="" />
              <el-option label="Success" value="success" />
              <el-option label="Failed" value="failed" />
              <el-option label="Reverted" value="reverted" />
            </el-select>
            <el-select v-model="filters.actionType" placeholder="Action Type" clearable collapse-tags multiple style="width: 200px">
              <el-option label="Create Issue" value="create_issue" />
              <el-option label="Update Issue" value="update_issue" />
              <el-option label="Assign Issue" value="assign_issue" />
              <el-option label="Create Spec" value="create_spec" />
            </el-select>
            <el-date-picker
              v-model="filters.dateRange"
              type="daterange"
              start-placeholder="Start"
              end-placeholder="End"
              format="MMM D"
              style="width: 240px"
            />
          </div>
          <div class="actions-group">
            <el-button v-if="selectedActions.length > 0" @click="bulkExport">
              <i class="ri-download-line"></i> Export ({{ selectedActions.length }})
            </el-button>
             <!-- Bulk Revert could go here -->
          </div>
        </div>

        <!-- History Table -->
        <div v-if="historyLoading" class="loading-state">
          <el-skeleton :rows="8" animated />
        </div>
        <div v-else class="history-table-container">
          <el-table 
            :data="actions" 
            style="width: 100%" 
            @selection-change="handleSelectionChange"
            :row-class-name="tableRowClassName"
          >
            <el-table-column type="selection" width="55" />
            <el-table-column label="Action" min-width="180">
              <template #default="{ row }">
                <div class="action-type-cell">
                  <i :class="getActionIcon(row.actionType)"></i>
                  <span>{{ formatActionType(row.actionType) }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column property="agentId" label="Agent" width="150" :formatter="(row) => formatAgentName(row.agentId)" />
            <el-table-column label="Entity" min-width="150">
              <template #default="{ row }">
                <span v-if="row.affectedEntityId" class="entity-link">
                  {{ row.affectedEntityType }}#{{ row.affectedEntityId.slice(0, 8) }}
                </span>
                <span v-else>—</span>
              </template>
            </el-table-column>
            <el-table-column label="Status" width="120">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status, row.revertedAt)" size="small">
                  {{ row.revertedAt ? 'Reverted' : row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column property="durationMs" label="Duration" width="100">
               <template #default="{ row }">{{ row.durationMs }}ms</template>
            </el-table-column>
            <el-table-column label="Time" width="140">
              <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column fixed="right" width="120">
              <template #default="{ row }">
                <el-dropdown trigger="click" @command="handleAction($event, row)">
                  <el-button type="text" size="small"><i class="ri-more-2-fill"></i></el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="view"><i class="ri-eye-line"></i> Details</el-dropdown-item>
                      <el-dropdown-item command="analyze"><i class="ri-pulse-line"></i> Analyze Impact</el-dropdown-item>
                      <el-dropdown-item v-if="!row.revertedAt && row.status === 'success'" command="revert"><i class="ri-arrow-go-back-line"></i> Revert</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination">
            <el-pagination
              v-model:current-page="currentPage"
              :page-size="pageSize"
              :total="total"
              layout="prev, pager, next"
              @current-change="loadActions"
            />
          </div>
        </div>
      </el-tab-pane>

      <!-- Compliance Tab -->
      <el-tab-pane label="Compliance Exports" name="compliance">
        <div class="compliance-header">
           <h3>Audit Reports</h3>
           <el-button type="primary" @click="generateExportDialog = true">
             <i class="ri-file-shield-2-line"></i> Generate New Report
           </el-button>
        </div>
        
        <el-table :data="complianceExports" style="width: 100%" v-loading="complianceLoading">
          <el-table-column label="Generated By" width="180">
            <template #default="{ row }">{{ row.generator?.fullName || 'Unknown' }}</template>
          </el-table-column>
          <el-table-column label="Date Range" width="220">
            <template #default="{ row }">
              {{ row.criteria?.startDate ? formatShortDate(row.criteria.startDate) : 'Start' }} - 
              {{ row.criteria?.endDate ? formatShortDate(row.criteria.endDate) : 'Now' }}
            </template>
          </el-table-column>
          <el-table-column prop="actionCount" label="Actions" width="100" />
          <el-table-column label="Signature Hash" min-width="200">
             <template #default="{ row }"><code class="hash">{{ row.signatureHash?.substring(0, 16) }}...</code></template>
          </el-table-column>
          <el-table-column label="Created" width="150">
             <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column fixed="right" width="100">
             <template #default="{}">
               <el-button type="text"><i class="ri-download-line"></i></el-button>
             </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- Modals -->
    <ActionImpactModal 
      v-model:visible="impactModalVisible" 
      :action-id="selectedActionId" 
    />

    <el-dialog v-model="generateExportDialog" title="Generate Compliance Report" width="400px">
       <el-form label-position="top">
         <el-form-item label="Date Range">
           <el-date-picker 
             v-model="exportDateRange" 
             type="daterange" 
             start-placeholder="Start" 
             end-placeholder="End" 
             style="width: 100%"
           />
         </el-form-item>
       </el-form>
       <template #footer>
         <el-button @click="generateExportDialog = false">Cancel</el-button>
         <el-button type="primary" :loading="generatingExport" @click="generateExport">Generate & Sign</el-button>
       </template>
    </el-dialog>

  </div>
</template>

<script>
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatDistanceToNow, format } from 'date-fns'
import ChatApi from '../services/chat-api'
import ActionCard from '../components/ActionCard.vue'
import ActionImpactModal from '../components/ActionImpactModal.vue'

export default {
  name: 'ActionsPage',
  components: { ActionCard, ActionImpactModal },
  setup() {
    const activeTab = ref('history')
    
    // -- History State --
    const historyLoading = ref(false)
    const actions = ref([])
    const total = ref(0)
    const currentPage = ref(1)
    const pageSize = 20
    const selectedActions = ref([])
    const impactModalVisible = ref(false)
    const selectedActionId = ref(null)

    const filters = reactive({
      status: '',
      actionType: [],
      dateRange: null,
    })

    // -- Pending State -- //
    const pendingLoading = ref(false)
    const pendingProposals = ref([])
    const processingId = ref(null)

    // -- Compliance State -- //
    const complianceLoading = ref(false)
    const complianceExports = ref([])
    const generateExportDialog = ref(false)
    const exportDateRange = ref(null)
    const generatingExport = ref(false)

    // -- Helpers -- //
    const formatTime = (date) => date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : ''
    const formatShortDate = (date) => date ? format(new Date(date), 'MMM d, yyyy') : ''
    
    const getActionIcon = (type) => {
      const map = {
        'create_issue': 'ri-add-circle-line',
        'update_issue': 'ri-edit-line',
        'assign_issue': 'ri-user-add-line',
        'create_spec': 'ri-file-add-line',
      }
      return map[type] || 'ri-flashlight-line'
    }

    const formatActionType = (type) => type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    const formatAgentName = (id) => id // In real app, map ID to name
    const getStatusType = (status, reverted) => {
        return 'info'
    }
    const tableRowClassName = ({ row }) => row.revertedAt ? 'reverted-row' : ''

    // -- Methods -- //

    const loadActions = async () => {
      historyLoading.value = true
      try {
        const params = {
          limit: pageSize,
          offset: (currentPage.value - 1) * pageSize,
        }
        if (filters.status) params.status = filters.status
        if (filters.actionType && filters.actionType.length) params.actionType = filters.actionType
        if (filters.dateRange) {
          params.startDate = filters.dateRange[0].toISOString()
          params.endDate = filters.dateRange[1].toISOString()
        }
        const res = await ChatApi.getActions(params)
        actions.value = res.rows
        total.value = res.count
      } catch (e) {
        console.error(e)
        ElMessage.error('Failed to load actions')
      } finally {
        historyLoading.value = false
      }
    }

    const loadPending = async () => {
      pendingLoading.value = true
      try {
        const res = await ChatApi.getPendingProposals() // Use tenant global
        pendingProposals.value = Array.isArray(res) ? res : []
      } catch (e) {
        ElMessage.error('Failed to load pending approvals')
      } finally {
        pendingLoading.value = false
      }
    }

    const loadCompliance = async () => {
       complianceLoading.value = true
       try {
         const res = await ChatApi.listComplianceExports()
         complianceExports.value = res.rows
       } catch (e) {
         ElMessage.error('Failed to load compliance reports')
       } finally {
         complianceLoading.value = false
       }
    }

    // Actions
    const handleAction = (command, row) => {
      if (command === 'analyze') {
        selectedActionId.value = row.id
        impactModalVisible.value = true
      } else if (command === 'revert') {
        revertAction(row)
      }
    }

    const revertAction = async (row) => {
      try {
        await ElMessageBox.confirm('Are you sure you want to revert/undo this action?', 'Revert Action', { type: 'warning' })
        await ChatApi.revertAction(row.id)
        ElMessage.success('Reverted successfully')
        loadActions()
      } catch (e) { 
        if(e !== 'cancel') ElMessage.error('Failed to revert') 
      }
    }

    const handleSelectionChange = (val) => {
      selectedActions.value = val
    }

    const bulkExport = () => {
      // In real app, create export from IDs
      ElMessage.success(`Exporting ${selectedActions.value.length} actions...`)
    }

    // Pending Actions
    const approveProposal = async (id) => {
       processingId.value = id
       try {
         await ChatApi.approveProposal(id)
         ElMessage.success('Approved')
         loadPending() // Refresh
       } catch (e) { ElMessage.error('Failed to approve') }
       finally { processingId.value = null }
    }

    const rejectProposal = async (id) => {
       processingId.value = id
       try {
         await ChatApi.rejectProposal(id, 'Rejected from Actions Page')
         ElMessage.success('Rejected')
         loadPending()
       } catch (e) { ElMessage.error('Failed to reject') }
       finally { processingId.value = null }
    }

    const modifyProposal = (proposal) => {
       ElMessage.info('Modification not yet supported from this view')
    }

    // Compliance
    const generateExport = async () => {
      generatingExport.value = true
      try {
        const criteria = {}
        if(exportDateRange) {
           criteria.startDate = exportDateRange.value[0]
           criteria.endDate = exportDateRange.value[1]
        }
        await ChatApi.generateComplianceExport(criteria)
        ElMessage.success('Report generated')
        generateExportDialog.value = false
        loadCompliance()
      } catch(e) { ElMessage.error('Generation failed') }
      finally { generatingExport.value = false }
    }

    // Init
    onMounted(() => {
      loadActions()
      loadPending()
    })

    watch(activeTab, (val) => {
      if(val === 'history') loadActions()
      if(val === 'pending') loadPending()
      if(val === 'compliance') loadCompliance()
    })

    watch(filters, () => { currentPage.value = 1; loadActions() }, { deep: true })

    return {
      activeTab,
      // History
      historyLoading, actions, total, currentPage, pageSize, filters, selectedActions,
      impactModalVisible, selectedActionId,
      // Pending
      pendingLoading, pendingProposals, processingId,
      // Compliance
      complianceLoading, complianceExports, generateExportDialog, exportDateRange, generatingExport,
      // Methods
      formatTime, formatShortDate, getActionIcon, formatActionType, formatAgentName, getStatusType,
      tableRowClassName, handleSelectionChange, handleAction, loadActions,
      approveProposal, rejectProposal, modifyProposal, generateExport, bulkExport
    }
  }
}
</script>

<style lang="scss" scoped>
.actions-page {
  padding: 16px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 16px;
  h1 { font-size: 24px; font-weight: 600; color: #fff; margin-bottom: 4px; }
  .subtitle { color: #a1a1aa; font-size: 14px; }
}

.filters-bar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  .filter-group { display: flex; gap: 12px; }
}

.proposals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 16px;
}

.action-type-cell {
  display: flex; align-items: center; gap: 8px;
  i { color: #fff; }
}

.compliance-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
  h3 { font-size: 18px; color: #fff; }
}

.hash { 
  font-family: monospace; color: #e4e4e7; background: rgba(255,255,255,0.1); padding: 2px 4px; border-radius: 4px; 
}

:deep(.reverted-row) {
  opacity: 0.6; text-decoration: line-through;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 16px;
  min-height: 250px;
  
  h3 {
    font-size: 20px;
    font-weight: 600;
    color: #fff;
    margin: 0 0 12px 0;
  }
  
  .empty-description {
    font-size: 14px;
    color: #a1a1aa;
    max-width: 400px;
    line-height: 1.5;
    margin: 0 0 16px 0;
  }
  
  .empty-hint {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #71717a;
    
    i {
      color: #fff;
    }
  }
}

.empty-icon-container {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: #18181b;
  border: 1px solid #27272a;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  
  i {
    font-size: 36px;
    color: #fff;
  }
}

// Dark Theme Table Styling
.history-table-container {
  background: #0a0a0a;
  border: 1px solid #27272a;
  border-radius: 12px;
  overflow: hidden;
}

:deep(.el-table) {
  background: #0a0a0a;
  --el-table-bg-color: #0a0a0a;
  --el-table-tr-bg-color: #0a0a0a;
  --el-table-header-bg-color: #18181b;
  --el-table-row-hover-bg-color: #18181b;
  --el-table-border-color: #27272a;
  --el-table-text-color: #e4e4e7;
  --el-table-header-text-color: #a1a1aa;
  
  th.el-table__cell {
    background: #18181b;
    border-bottom: 1px solid #27272a;
    font-weight: 500;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  td.el-table__cell {
    border-bottom: 1px solid #27272a;
    padding: 8px 0;
  }
  
  .el-table__row:hover > td.el-table__cell {
    background: #18181b;
  }
}

// Dark Theme Filter Styling  
:deep(.el-select) {
  --el-select-input-focus-border-color: #3b82f6;
  
  .el-input__wrapper {
    background: #18181b;
    border-color: #27272a;
    box-shadow: none;
    
    &:hover {
      border-color: #3f3f46;
    }
    
    &.is-focus {
      border-color: #3b82f6;
    }
  }
  
  .el-input__inner {
    color: #e4e4e7;
    
    &::placeholder {
      color: #71717a;
    }
  }
}

:deep(.el-date-editor) {
  --el-input-bg-color: #18181b;
  --el-input-border-color: #27272a;
  --el-input-text-color: #e4e4e7;
  --el-input-placeholder-color: #71717a;
  
  .el-input__wrapper {
    background: #18181b;
    border-color: #27272a;
    box-shadow: none;
    
    &:hover {
      border-color: #3f3f46;
    }
  }
  
  .el-range-input {
    background: transparent;
    color: #e4e4e7;
  }
  
  .el-range-separator {
    color: #71717a;
  }
}

.pagination {
  padding: 16px;
  display: flex;
  justify-content: center;
  background: #0a0a0a;
  border-top: 1px solid #27272a;
}

:deep(.el-tabs__item.is-active) {
  color: #3b82f6 !important;
}

:deep(.el-tabs__active-bar) {
  background-color: #3b82f6 !important;
}

:deep(.el-tabs__item:hover) {
  color: #3b82f6 !important;
}

:deep(.el-tabs__nav-wrap::after) {
  background-color: #27272a;
}
</style>
