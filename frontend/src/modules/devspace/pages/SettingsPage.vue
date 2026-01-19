<template>
  <div class="settings-page devspace-page">
    <div class="page-header" v-if="activeProject">
      <h1>Settings</h1>
    </div>

    <!-- Empty State / Access Control -->
    <div v-if="!activeProject" class="no-project-state">
      <el-empty description="No Project Selected">
        <template #description>
          <p>Please select a project from the top navigation dropdown to manage its settings.</p>
        </template>
      </el-empty>
    </div>

    <div v-else class="settings-layout">
      <!-- Settings Navigation -->
      <div class="settings-nav">
        <div 
          v-for="section in sections" 
          :key="section.id"
          class="nav-item"
          :class="{ active: activeSection === section.id }"
          @click="activeSection = section.id"
        >
          <el-icon><component :is="section.icon" /></el-icon>
          <span>{{ section.label }}</span>
        </div>
      </div>

      <!-- Settings Content -->
      <div class="settings-content">
        <!-- General Settings -->
        <div v-show="activeSection === 'general'" class="settings-section">
          <!-- Project Identity -->
          <el-card shadow="never" class="settings-card">
            <template #header>
              <div class="card-header">
                <h3>Change Project Details</h3>
              </div>
            </template>
            <el-form label-position="top" class="settings-form" v-loading="loading">
              <div class="form-row">
                 <el-form-item class="flex-1">
                   <template #label>
                     <span class="field-label">
                       Project Name
                       <el-tooltip content="The display name of the project used throughout the workspace." placement="top">
                         <el-icon class="info-icon"><InfoFilled /></el-icon>
                       </el-tooltip>
                     </span>
                   </template>
                   <el-input 
                    v-model="settings.projectName" 
                    placeholder="Project name" 
                    @input="handleProjectNameInput" 
                   />
                 </el-form-item>
                 <el-form-item class="flex-1">
                   <template #label>
                     <span class="field-label">
                       Project Key
                       <el-tooltip content="A short identifier used as a prefix for issue IDs (e.g., PROJ-123)." placement="top">
                         <el-icon class="info-icon"><InfoFilled /></el-icon>
                       </el-tooltip>
                     </span>
                   </template>
                   <el-input v-model="settings.projectKey" placeholder="e.g., PROJ" :maxlength="10" />
                 </el-form-item>
              </div>
              <el-form-item>
                <template #label>
                  <span class="field-label">
                    Description
                    <el-tooltip content="A brief summary of what this project is about." placement="top">
                      <el-icon class="info-icon"><InfoFilled /></el-icon>
                    </el-tooltip>
                  </span>
                </template>
                <el-input v-model="settings.projectDescription" type="textarea" :rows="3" placeholder="Brief description of the project" />
              </el-form-item>
            </el-form>
          </el-card>

          <!-- Agile Configuration -->
          <el-card shadow="never" class="settings-card mt-4">
            <template #header>
               <div class="card-header">
                 <h3>Agile Configuration</h3>
               </div>
            </template>
            <el-form label-position="top" class="settings-form" v-loading="loading">
              <div class="form-row">
                <el-form-item class="flex-1">
                   <template #label>
                     <span class="field-label">
                       Default Cycle Length
                       <el-tooltip content="The standard duration for sprints or cycles in this project." placement="top">
                         <el-icon class="info-icon"><InfoFilled /></el-icon>
                       </el-tooltip>
                     </span>
                   </template>
                  <el-select v-model="settings.cycleLength" style="width: 100%">
                    <el-option :value="7" label="1 Week" />
                    <el-option :value="14" label="2 Weeks" />
                    <el-option :value="21" label="3 Weeks" />
                    <el-option :value="30" label="1 Month" />
                  </el-select>
                </el-form-item>
                <el-form-item class="flex-1">
                   <template #label>
                     <span class="field-label">
                       Story Point Scale
                       <el-tooltip content="The estimation scale used for sizing issues (Fibonacci, Linear, etc.)." placement="top">
                         <el-icon class="info-icon"><InfoFilled /></el-icon>
                       </el-tooltip>
                     </span>
                   </template>
                  <el-select v-model="settings.storyPointScale" style="width: 100%">
                    <el-option value="fibonacci" label="Fibonacci (1, 2, 3, 5, 8, 13)" />
                    <el-option value="linear" label="Linear (1-10)" />
                    <el-option value="tshirt" label="T-Shirt (XS, S, M, L, XL)" />
                  </el-select>
                </el-form-item>
              </div>
            </el-form>
          </el-card>

          <div class="form-actions mt-4">
             <el-button type="primary" @click="saveGeneralSettings">Save Changes</el-button>
          </div>

          <!-- Danger Zone -->
          <div class="danger-zone mt-8">
            <div class="danger-action">
              <div>
                <h4>Delete Project "{{ activeProject.name }}"</h4>
                <p>This action cannot be undone. All issues and cycles in <strong>{{ activeProject.name }}</strong> will be deleted.</p>
              </div>
              <el-button type="danger" plain @click="confirmDeleteProject">Delete {{ activeProject.name }}</el-button>
            </div>
          </div>
        </div>

        <!-- Integrations -->
        <div v-show="activeSection === 'integrations'" class="settings-section">
          <h2>Integrations</h2>
          

          <el-card shadow="never" class="settings-card">
              <template #header>
                  <div class="card-header flex justify-between items-center">
                      <h3>GitHub Sync</h3>
                      <el-button 
                        type="warning" 
                        plain 
                        size="small" 
                        @click="openConflictQueue" 
                        v-if="settings.githubSync.direction === 'dominant'"
                      >
                        Conflict Queue
                      </el-button>
                  </div>
              </template>
             <div class="integration-item mb-6">
              <div class="integration-info">
                <div class="integration-icon github">G</div>
                <div>
                  <h4>Repository Configuration</h4>
                  <p>Select the repository to link with this project.</p>
                </div>
              </div>
              <div class="integration-config pl-4 flex-1">
                <el-input 
                  v-model="settings.githubRepo" 
                  placeholder="owner/repo (e.g., alveoli-app/gitmesh-ce)"
                  :disabled="!isWorkspaceIntegrationConnected('github')"
                >
                  <template #append>
                    <el-button @click="saveIntegrationSettings" :disabled="!isWorkspaceIntegrationConnected('github')" :loading="syncing">
                      {{ syncing ? 'Syncing...' : 'Save' }}
                    </el-button>
                  </template>
                </el-input>
                <div v-if="syncing" class="mt-2 text-xs" style="color: var(--el-color-primary)">
                  <el-icon class="is-loading"><Loading /></el-icon>
                  {{ syncProgress || 'Syncing issues from GitHub...' }}
                </div>
                <div class="mt-2 text-xs text-secondary" v-if="!isWorkspaceIntegrationConnected('github')">
                  <span class="text-warning">GitHub not connected.</span> 
                  <a @click="goToIntegrationsPage" class="link cursor-pointer ml-1">Connect in Workspace Integrations</a>
                </div>
              </div>
            </div>

            <el-divider />

            <!-- Sync Strategy (Hardcoded to Dominant) -->
            <div class="mb-6">
                <el-alert
                    title="Dominant One-Way Sync Active"
                    type="success"
                    :closable="false"
                    show-icon
                >
                    <template #default>
                        <div class="text-sm">
                            <p class="mb-1">Your project is configured for <strong>GitHub → GitMesh Dominant Sync</strong>.</p>
                             <ul class="list-disc pl-5 mt-1 space-y-1">
                                <li><strong>Inbound:</strong> All GitHub issues, comments, and labels sync to GitMesh in real-time.</li>
                                <li><strong>Outbound:</strong> Changes in GitMesh are <strong>NOT auto-pushed</strong> to GitHub.</li>
                                <li><strong>Publishing:</strong> Only issues marked <code>publishable</code> and approved by an Admin are pushed.</li>
                            </ul>
                        </div>
                    </template>
                </el-alert>
            </div>

            <!-- Advanced Config -->
            <div class="p-4 rounded-md border" style="background: var(--el-fill-color-light); border-color: var(--el-border-color-light);">
                <h4 class="mb-3 text-sm font-bold uppercase" style="color: var(--el-text-color-secondary)">Dominant Sync Controls</h4>
                
                <!-- Role Visibility -->
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-1" style="color: var(--el-text-color-primary)">Role-Based Push Control</label>
                    <div class="text-xs mb-2" style="color: var(--el-text-color-secondary)">Controls who can push changes back to GitHub.</div>
                    <div class="grid grid-cols-3 gap-2 text-sm">
                        <div class="p-2 border rounded" style="background: var(--el-bg-color); border-color: var(--el-border-color);">
                            <div class="font-bold" style="color: var(--el-text-color-primary)">Admin</div>
                            <div class="text-xs text-green-600">Full Override</div>
                        </div>
                        <div class="p-2 border rounded" style="background: var(--el-bg-color); border-color: var(--el-border-color);">
                            <div class="font-bold" style="color: var(--el-text-color-primary)">Team</div>
                            <div class="text-xs text-orange-600">Approval Required</div>
                        </div>
                         <div class="p-2 border rounded" style="background: var(--el-bg-color); border-color: var(--el-border-color);">
                            <div class="font-bold" style="color: var(--el-text-color-primary)">Private</div>
                            <div class="text-xs text-red-600">Never Push</div>
                        </div>
                    </div>
                </div>

                <!-- Conflict Resolution -->
                <el-form label-position="top">
                    <div class="form-row">
                        <el-form-item label="Conflict Resolution Strategy" class="flex-1 mb-0">
                             <el-select v-model="settings.githubSync.conflictResolution" class="w-full">
                                 <el-option label="Default to GitHub (GitHub Wins)" value="github-wins" />
                                 <el-option label="Manual (Admin Queue)" value="manual" />
                             </el-select>
                             <div class="text-xs mt-1" style="color: var(--el-text-color-secondary)">
                                 On same-field conflicts, this rule determines the winner. Non-overlapping changes are auto-merged.
                             </div>
                        </el-form-item>
                    </div>
                </el-form>
            </div>

            <div class="mt-4 flex justify-end items-center">
                 <div v-if="syncing" class="mr-4 text-sm" style="color: var(--el-color-primary)">
                   <el-icon class="is-loading"><Loading /></el-icon>
                   {{ syncProgress || 'Syncing issues from GitHub...' }}
                 </div>
                 <el-button type="primary" @click="saveIntegrationSettings" :loading="syncing" :disabled="syncing">
                   {{ syncing ? 'Syncing...' : 'Update Sync Settings' }}
                 </el-button>
            </div>
          </el-card>

          <div class="mt-6">
            <h4 class="mb-3 text-secondary uppercase text-xs font-bold tracking-wide">Workspace Connections</h4>
            <div v-for="provider in availableProviders" :key="provider.id" class="integration-card-row mb-2">
              <div class="flex items-center gap-3">
                <div class="integration-icon-small" :class="provider.id">{{ provider.icon }}</div>
                <span class="font-medium text-sm">{{ provider.name }}</span>
              </div>
              <el-tag 
                :type="isWorkspaceIntegrationConnected(provider.id) ? 'success' : 'info'"
                size="small"
                effect="plain"
              >
                {{ isWorkspaceIntegrationConnected(provider.id) ? 'Connected' : 'Not Connected' }}
              </el-tag>
            </div>
             <el-button link type="primary" size="small" @click="goToIntegrationsPage" class="mt-2">Manage All Connections &rarr;</el-button>
          </div>
        </div>


        <!-- AI Settings -->
        <div v-show="activeSection === 'ai'" class="settings-section">
          <h2>AI Agent Settings</h2>
          <el-form label-position="top" class="settings-form" v-loading="loading">
            <el-form-item label="Enabled Agents">
              <div class="checkbox-list">
                <el-checkbox v-model="aiSettings.enabledAgents" label="prioritize">
                  <span class="custom-checkbox-label">Issue Prioritization</span>
                </el-checkbox>
                <el-checkbox v-model="aiSettings.enabledAgents" label="suggest-sprint">
                  <span class="custom-checkbox-label">Sprint Suggestions</span>
                </el-checkbox>
                <el-checkbox v-model="aiSettings.enabledAgents" label="breakdown">
                  <span class="custom-checkbox-label">Issue Breakdown</span>
                </el-checkbox>
                <el-checkbox v-model="aiSettings.enabledAgents" label="assignee">
                  <span class="custom-checkbox-label">Assignee Suggestions</span>
                </el-checkbox>
                <el-checkbox v-model="aiSettings.enabledAgents" label="generate-spec">
                  <span class="custom-checkbox-label">Spec Generation</span>
                </el-checkbox>
              </div>
            </el-form-item>
            <el-form-item label="Approval Required">
              <el-switch v-model="aiSettings.approvalRequired" />
              <span class="form-hint">Require manual approval before AI changes are applied</span>
            </el-form-item>
            <el-form-item label="Temperature">
              <el-slider v-model="aiSettings.temperature" :min="0" :max="1" :step="0.1" show-input />
              <span class="form-hint">Lower = more focused, Higher = more creative</span>
            </el-form-item>
            <el-button type="primary" @click="saveAiSettings">Save AI Settings</el-button>
          </el-form>
        </div>

        <!-- Webhooks -->
        <div v-show="activeSection === 'webhooks'" class="settings-section">
          <h2>Webhooks</h2>
          <div class="webhooks-list" v-loading="loading">
            <template v-if="webhooks.length > 0">
              <div v-for="webhook in webhooks" :key="webhook.id" class="webhook-card">
                <div class="webhook-info">
                  <code class="webhook-url">{{ webhook.url }}</code>
                  <div class="webhook-events">
                    <el-tag v-for="event in webhook.events?.slice(0, 3)" :key="event" size="small">
                      {{ event }}
                    </el-tag>
                    <span v-if="webhook.events?.length > 3">+{{ webhook.events.length - 3 }}</span>
                  </div>
                </div>
                <div class="webhook-actions">
                  <el-switch v-model="webhook.enabled" @change="toggleWebhook(webhook)" />
                  <el-button size="small" type="danger" @click="removeWebhook(webhook)">Delete</el-button>
                </div>
              </div>
            </template>
            <el-empty v-else description="No webhooks configured" :image-size="80" />
            <div class="add-webhook">
              <el-button @click="showAddWebhook = true">
                <el-icon><Plus /></el-icon>
                Add Webhook
              </el-button>
            </div>
          </div>
        </div>

        <!-- Access Control (Placeholder) -->
        <div v-show="activeSection === 'access'" class="settings-section">
            <h2>Access Control</h2>
            <div class="access-placeholder">
                <el-empty description="Access Control">
                    <template #image>
                        <el-icon :size="60" color="#909399"><Lock /></el-icon>
                    </template>
                    <template #description>
                        <p>Project access and permissions are currently managed at the Workspace level.</p>
                        <router-link to="/workspace/settings/members">
                            <el-button type="primary">Manage Workspace Members</el-button>
                        </router-link>
                    </template>
                </el-empty>
            </div>
        </div>
      </div>
    </div>

    <!-- Add Webhook Modal -->
    <el-dialog v-model="showAddWebhook" title="Add Webhook" width="500px">
      <el-form label-position="top">
        <el-form-item label="URL">
          <el-input v-model="newWebhook.url" placeholder="https://..." />
        </el-form-item>
        <el-form-item label="Events">
          <div class="checkbox-list">
            <el-checkbox-group v-model="newWebhook.events" class="flex flex-col gap-2">
                <el-checkbox label="issue.created">
                    <span class="custom-checkbox-label">Issue Created</span>
                </el-checkbox>
                <el-checkbox label="issue.updated">
                    <span class="custom-checkbox-label">Issue Updated</span>
                </el-checkbox>
                <el-checkbox label="cycle.started">
                    <span class="custom-checkbox-label">Cycle Started</span>
                </el-checkbox>
                <el-checkbox label="cycle.completed">
                    <span class="custom-checkbox-label">Cycle Completed</span>
                </el-checkbox>
            </el-checkbox-group>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddWebhook = false">Cancel</el-button>
        <el-button type="primary" @click="addWebhook">Create</el-button>
      </template>
    </el-dialog>

    <!-- Conflict Queue Modal -->
    <el-dialog v-model="showConflictModal" title="Sync Conflict Queue" width="800px">
      <div v-if="conflictQueue.length === 0" class="text-center py-8 text-secondary">
         <el-icon :size="40" class="mb-2"><InfoFilled /></el-icon>
         <p>No sync conflicts detected within the last 24h. All systems synchronized.</p>
      </div>
      <div v-else>
         <p class="text-sm text-secondary mb-4">The following items have data conflicts between GitHub and GitMesh. Select a version to keep.</p>
         
         <div v-for="conflict in conflictQueue" :key="conflict.id" class="border rounded p-4 mb-3">
            <div class="flex justify-between items-start mb-2">
               <div>
                  <span class="font-bold text-sm">{{ conflict.title }}</span>
                  <span class="text-xs text-secondary ml-2">issue #{{ conflict.issueId }}</span>
               </div>
               <el-tag type="danger" size="small">Field: {{ conflict.field }}</el-tag>
            </div>
            
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div class="p-2 rounded border" style="background: var(--el-fill-color-light); border-color: var(--el-border-color-light);">
                    <div class="font-bold text-xs mb-1 flex items-center gap-1" style="color: var(--el-text-color-secondary)">
                        <div class="site-icon github-small">G</div> 
                        GitHub (Incoming)
                    </div>
                    <div class="whitespace-pre-wrap font-mono text-xs" style="color: var(--el-text-color-regular)">{{ conflict.remoteValue }}</div>
                    <div class="text-xs mt-1" style="color: var(--el-text-color-secondary)">By {{ conflict.remoteAuthor }}</div>
                </div>
                <div class="p-2 rounded border" style="background: var(--el-color-primary-light-9); border-color: var(--el-color-primary-light-8);">
                    <div class="font-bold text-xs mb-1 flex items-center gap-1" style="color: var(--el-text-color-secondary)">
                        <div class="site-icon gitmesh-small">M</div> 
                        GitMesh (Current)
                    </div>
                    <div class="whitespace-pre-wrap font-mono text-xs" style="color: var(--el-text-color-regular)">{{ conflict.localValue }}</div>
                    <div class="text-xs mt-1" style="color: var(--el-text-color-secondary)">By {{ conflict.localAuthor }}</div>
                </div>
            </div>
            
            <div class="flex justify-end gap-2 mt-3">
                <el-button size="small" @click="resolveConflict(conflict.id, 'local')">Keep GitMesh Version</el-button>
                <el-button size="small" type="primary" @click="resolveConflict(conflict.id, 'remote')">Accept GitHub Version</el-button>
            </div>
         </div>
      </div>
      <template #footer>
        <el-button @click="showConflictModal = false">Close</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { Setting, Link, Cpu, Connection, Plus, InfoFilled, Check, Loading } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import DevtelService from '@/modules/devspace/services/devtel-api';

export default {
  name: 'SettingsPage',
  components: { Setting, Link, Cpu, Connection, Plus, InfoFilled, Check, Loading },
  data() {
    return {
      activeSection: 'general',
      sections: [
        { id: 'general', label: 'General', icon: 'Setting' },
        { id: 'integrations', label: 'Integrations', icon: 'Link' },
        { id: 'ai', label: 'AI Agents', icon: 'Cpu' },
        { id: 'webhooks', label: 'Webhooks', icon: 'Connection' },
      ],
      availableProviders: [
        { id: 'github', name: 'GitHub', icon: 'G', description: 'Sync issues and pull requests' },
        { id: 'slack', name: 'Slack', icon: 'S', description: 'Send notifications to Slack channels' },
      ],
      settings: {
        projectName: '',
        projectKey: '',
        projectDescription: '',
        cycleLength: 14,
        storyPointScale: 'fibonacci',
        githubRepo: '',
        // GitHub Sync Advanced Settings
        githubSync: {
          direction: 'dominant', // 'dominant' (GitHub -> GitMesh) or 'bidirectional'
          publishableDefault: false,
          conflictResolution: 'github-wins', // 'github-wins', 'manual'
          roleVisibility: {
             admin: 'override',
             team: 'approval',
             private: 'never'
          },
          autoPush: false, // Force disabled for dominant sync
        }
      },
      webhooks: [],
      conflictQueue: [],
      showConflictModal: false,
      syncing: false,
      syncProgress: '',
      aiSettings: {
        enabledAgents: ['prioritize', 'suggest-sprint'],
        approvalRequired: true,
        temperature: 0.7,
      },
      showAddWebhook: false,
      newWebhook: { url: '', events: [] },
      loading: false,
      workspaceData: null,
      projectData: null,
    };
  },
  computed: {
    projectId() {
      return this.$store.getters['devspace/activeProject']?.id;
    },
    activeProject() {
      return this.$store.getters['devspace/activeProject'];
    },
    workspaceId() {
      return this.$store.getters['devspace/activeWorkspace']?.id;
    },
    workspaceIntegrations() {
      // Get integrations from the global integration store (same as /integrations page)
      return this.$store.getters['integration/listByPlatform'] || {};
    },
  },
  watch: {
    workspaceId: {
      immediate: true,
      handler(val) {
        if (val) this.fetchSettings();
      },
    },
    // React to project changes in the global dropdown
    activeProject: {
      immediate: true,
      deep: true,
      handler(newVal, oldVal) {
        // Only fetch if project ID actually changed to avoid cycles or unnecessary reloads
        // Also trigger on initial load when oldVal is undefined
        if (newVal && (oldVal === undefined || newVal?.id !== oldVal?.id)) {
          this.populateSettingsFromProject(newVal);
        }
      }
    }
  },
  async mounted() {
    // Ensure the integration store is loaded when mounting the settings page
    if (this.$store.state.integration.count === 0) {
      await this.$store.dispatch('integration/doFetch');
    }
  },
  methods: {
    populateSettingsFromProject(project) {
      if (!project) return;
      
      this.settings.projectName = project.name || '';
      this.settings.projectKey = project.prefix || '';
      this.settings.projectDescription = project.description || '';
      this.settings.cycleLength = project.settings?.cycleLength || 14;
      this.settings.storyPointScale = project.settings?.storyPointScale || 'fibonacci';
      this.settings.githubRepo = project.settings?.githubRepo || '';
      
      // Populate GitHub Sync Settings
      const ghSettings = project.settings?.githubSync || {};
      this.settings.githubSync = {
          direction: ghSettings.direction || 'dominant',
          publishableDefault: ghSettings.publishableDefault ?? false,
          conflictResolution: ghSettings.conflictResolution || 'github-wins',
          roleVisibility: ghSettings.roleVisibility || {
             admin: 'override',
             team: 'approval',
             private: 'never'
          },
          autoPush: ghSettings.autoPush ?? false
      };

      this.projectData = project;
    },
    isWorkspaceIntegrationConnected(provider) {
      const integration = this.workspaceIntegrations?.[provider];
      return !!(integration && (integration.status === 'done' || integration.status === 'in-progress' || integration.status === 'active'));
    },
    getIntegrationStatusText(provider) {
      const integration = this.workspaceIntegrations?.[provider];
      if (!integration) {
        return 'Not connected - click Connect to set up';
      }
      if (integration.status === 'done' || integration.status === 'active') {
        return 'Connected and syncing';
      }
      if (integration.status === 'in-progress') {
        return 'Connection in progress';
      }
      return `Status: ${integration.status}`;
    },
    goToIntegrationsPage() {
      this.$router.push('/integrations');
    },
    async fetchSettings() {
      if (!this.workspaceId) return;
      
      this.loading = true;
      try {
        const [webhooks, agentSettings, generalSettings] = await Promise.all([
          DevtelService.listWebhooks(this.workspaceId),
          DevtelService.getAgentSettings(this.workspaceId),
          DevtelService.getGeneralSettings(this.workspaceId),
        ]);
        
        this.webhooks = Array.isArray(webhooks) ? webhooks : (webhooks?.rows || []);
        
        if (agentSettings) {
          this.aiSettings = {
            enabledAgents: agentSettings.enabledAgents || ['prioritize', 'suggest-sprint'],
            approvalRequired: agentSettings.approvalRequired ?? true,
            temperature: parseFloat(agentSettings.temperature) || 0.7,
          };
        }

        // Store workspace data
        if (generalSettings) {
          this.workspaceData = generalSettings;
        }

        // Apply workspace-level defaults if project settings don't override them
        if (this.activeProject && generalSettings) {
            const workspaceSettings = generalSettings?.workspaceSettings || {};
            if (!this.activeProject.settings?.cycleLength) {
              this.settings.cycleLength = workspaceSettings.defaultCycleLength || 14;
            }
            if (!this.activeProject.settings?.storyPointScale) {
              this.settings.storyPointScale = workspaceSettings.storyPointScale || 'fibonacci';
            }
        }

      } catch (e) {
        console.error('Failed to fetch settings', e);
        ElMessage.error('Failed to load settings');
      } finally {
        this.loading = false;
      }
    },
    handleProjectNameInput(val) {
        // If key hasn't been manually edited and is empty or matches previous generation, auto-generate
        // Simple logic: if key is empty or matches part of name, update it.
        // For safer UX, only auto-fill if key is empty to avoid overwriting user intent
        if (!this.settings.projectKey) {
            this.settings.projectKey = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
        }
    },
    async saveGeneralSettings() {
      if (!this.settings.projectName) {
          ElMessage.warning('Project Name is required');
          return;
      }
      
      try {
        if (!this.activeProject) return;

        // Warning for critical changes
        if (this.settings.projectName !== this.activeProject.name || this.settings.projectKey !== this.activeProject.prefix) {
             const confirmed = await ElMessageBox.confirm(
                'You are modifying critical project identity (Name or Key). This may affect search results and issue links. Are you sure you want to proceed?',
                'Confirm Project Update',
                {
                    confirmButtonText: 'Yes, Update',
                    cancelButtonText: 'Cancel',
                    type: 'warning'
                }
             ).then(() => true).catch(() => false);
             
             if (!confirmed) return;
        }

        const projectUpdate = {
          name: this.settings.projectName,
          prefix: this.settings.projectKey,
          description: this.settings.projectDescription,
          settings: {
            ...this.activeProject.settings,
            cycleLength: this.settings.cycleLength,
            storyPointScale: this.settings.storyPointScale,
          }
        };
          
        await this.$store.dispatch('devspace/updateProject', {
          id: this.activeProject.id,
          data: projectUpdate
        });
        
        await this.$store.dispatch('devspace/fetchProjects');
        
        ElMessage.success('Settings saved');
      } catch (e) {
        console.error('Failed to save settings', e);
        ElMessage.error('Failed to save settings');
      }
    },
    async saveIntegrationSettings() {
      console.log('[Settings] Starting saveIntegrationSettings');
      console.log('[Settings] Active Project:', this.activeProject?.id, this.activeProject?.name);
      console.log('[Settings] Current Settings:', JSON.stringify(this.settings.githubSync, null, 2));
      
      try {
        if (!this.activeProject) {
          console.error('[Settings] No active project found');
          return;
        }

        // Strip URL if present
        let cleanRepo = this.settings.githubRepo.trim();
        console.log('[Settings] GitHub Repo (raw):', cleanRepo);
        if (cleanRepo.startsWith('http')) {
             try {
                 const url = new URL(cleanRepo);
                 const path = url.pathname.replace(/^\/|\/$/g, '');
                 // Expecting owner/repo
                 const parts = path.split('/');
                 if (parts.length >= 2) {
                     cleanRepo = `${parts[0]}/${parts[1]}`;
                 }
             } catch (e) {
                 // Invalid URL, keep as is
             }
        }
        
        // Basic validation
        if (cleanRepo && !cleanRepo.includes('/')) {
             ElMessage.warning('Invalid repository format. Please use "owner/repo" format.');
             return;
        }

        // Update UI model if changed
        this.settings.githubRepo = cleanRepo;

        this.loading = true;
        this.syncing = true;
        this.syncProgress = 'Saving settings...';
        const projectUpdate = {
            settings: {
                ...this.activeProject.settings,
                githubRepo: cleanRepo,
                githubSync: this.settings.githubSync,
            }
        };
        
        console.log('[Settings] Project Update Payload:', JSON.stringify(projectUpdate, null, 2));
        console.log('[Settings] Calling updateProject for:', this.activeProject.id);

        const updateResult = await DevtelService.updateProject(this.activeProject.id, projectUpdate);
        console.log('[Settings] Update Result:', updateResult);
        
        // Trigger sync
        this.syncProgress = 'Syncing issues from GitHub...';
        console.log('[Settings] Triggering sync for project:', this.activeProject.id);
        try {
            const syncResult = await DevtelService.triggerSync(this.activeProject.id);
            console.log('[Settings] Sync completed:', syncResult);
            
            // Show detailed success message
            if (syncResult.result) {
                const { createdCount, updatedCount, syncedCount } = syncResult.result;
                ElMessage.success({
                    message: `Sync completed! Created: ${createdCount}, Updated: ${updatedCount}, Total: ${syncedCount}`,
                    duration: 5000,
                    showClose: true
                });
            } else {
                ElMessage.success({
                    message: 'Settings saved and sync triggered successfully!',
                    duration: 5000,
                    showClose: true
                });
            }
        } catch (syncError) {
             console.error('[Settings] Sync failed:', syncError);
             console.error('[Settings] Sync error details:', syncError.response?.data);
             
             // Show specific error message
             const errorMsg = syncError.response?.data?.error || syncError.message || 'Unknown error';
             ElMessage.error({
                 message: `Sync failed: ${errorMsg}`,
                 duration: 8000,
                 showClose: true
             });
             throw syncError; // Rethrow to skip success message
        }

        this.syncProgress = 'Refreshing project list...';
        console.log('[Settings] Fetching updated projects...');
        await this.$store.dispatch('devspace/fetchProjects'); // re-fetch to update state
        console.log('[Settings] Projects refreshed successfully');
        
      } catch (e) {
        console.error('[Settings] SAVE FAILED:', e);
        console.error('[Settings] Error Stack:', e.stack);
        console.error('[Settings] Error Response:', e.response?.data);
        ElMessage.error('Failed to save integration settings: ' + (e.message || 'Unknown error'));
      } finally {
        this.loading = false;
      }
    },
    async confirmDeleteProject() {
      try {
        await ElMessageBox.confirm(
          `Are you sure you want to delete the project "${this.activeProject.name}"? This will permanently delete all issues, cycles, and history associated with this project. This action cannot be undone.`,
          `Delete Project: ${this.activeProject.name}`,
          {
            confirmButtonText: `Delete ${this.activeProject.name}`,
            cancelButtonText: 'Cancel',
            type: 'warning',
            confirmButtonClass: 'el-button--danger',
          }
        );

        await this.$store.dispatch('devspace/deleteProject', this.activeProject.id);
        ElMessage.success('Project deleted');
        
        // Refresh project list to ensure we switch to a valid remaining project
        await this.$store.dispatch('devspace/fetchProjects');
        this.$router.push('/devspace'); 
        
      } catch (e) {
        if (e !== 'cancel') {
          console.error(e);
          ElMessage.error('Failed to delete project');
        }
      }
    },
    async saveAiSettings() {
      try {
        await DevtelService.updateAgentSettings(this.workspaceId, this.aiSettings);
        ElMessage.success('AI settings saved');
      } catch (e) {
        ElMessage.error('Failed to save');
      }
    },
    async addWebhook() {
      if (!this.newWebhook.url) {
        ElMessage.warning('Please enter a webhook URL');
        return;
      }
      try {
        const webhook = await DevtelService.createWebhook(this.workspaceId, this.newWebhook);
        this.webhooks.push(webhook);
        this.showAddWebhook = false;
        this.newWebhook = { url: '', events: [] };
        ElMessage.success('Webhook created');
      } catch (e) {
        ElMessage.error('Failed to create webhook');
      }
    },
    async toggleWebhook(webhook) {
      try {
        await DevtelService.updateWebhook(this.workspaceId, webhook.id, { enabled: webhook.enabled });
      } catch (e) {
        webhook.enabled = !webhook.enabled;
        ElMessage.error('Failed to update webhook');
      }
    },
    async removeWebhook(webhook) {
      try {
        await DevtelService.deleteWebhook(this.workspaceId, webhook.id);
        this.webhooks = this.webhooks.filter(w => w.id !== webhook.id);
        ElMessage.success('Webhook deleted');
      } catch (e) {
        ElMessage.error('Failed to delete webhook');
      }
    },
    async openConflictQueue() {
       this.showConflictModal = true;
       if (!this.activeProject?.id) return;
       
       try {
         const conflicts = await DevtelService.getConflicts(this.activeProject.id);
         this.conflictQueue = conflicts || [];
       } catch (e) {
         console.error('Failed to fetch conflicts', e);
         ElMessage.error('Failed to load conflict queue');
         this.conflictQueue = [];
       }
    },
    async resolveConflict(id, winner) {
        try {
            if (!this.activeProject?.id) return;
            
            await DevtelService.resolveConflict(this.activeProject.id, id, winner);
            
            const action = winner === 'remote' ? 'Overwritten with GitHub version' : 'Kept GitMesh version';
            ElMessage.success(`Conflict resolved: ${action}`);
            
            // Remove from queue locally
            this.conflictQueue = this.conflictQueue.filter(c => c.id !== id);
            
            if (this.conflictQueue.length === 0) {
                setTimeout(() => {
                    this.showConflictModal = false;
                }, 1000);
            }
        } catch (e) {
            console.error('Failed to resolve conflict', e);
            ElMessage.error('Failed to resolve conflict');
        }
    },
  },
};
</script>

<style scoped>
@import '../styles/devspace-common.css';

.no-project-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  background: var(--el-bg-color);
  border-radius: 8px;
  border: 1px dashed var(--el-border-color);
  margin-top: 24px;
}
.settings-page {
  padding: 24px;
}
.page-header h1 {
  margin: 0 0 24px;
  font-size: 24px;
  font-weight: 600;
}
.settings-layout {
  display: flex;
  gap: 24px;
}
.settings-nav {
  width: 200px;
  flex-shrink: 0;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--el-text-color-regular);
}
.nav-item:hover {
  background: var(--el-fill-color-light);
}
.nav-item.active {
  background: rgba(59, 130, 246, 0.1);
  color: var(--el-color-primary);
  font-weight: 500;
}
.settings-content {
  flex: 1;
  min-width: 0;
}
.settings-section {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 24px;
}
.settings-section h2 {
  margin: 0 0 8px;
  font-size: 18px;
}
.section-description {
  margin: 0 0 20px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.section-description a {
  color: var(--el-color-primary);
  text-decoration: none;
}
.section-description a:hover {
  text-decoration: underline;
}
.settings-form {
  max-width: 500px;
}
.form-hint {
  display: block;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}
.integrations-list, .webhooks-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.integration-card, .webhook-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
}
.integration-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.integration-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: white;
}
.integration-icon.github { background: #333; }
.integration-icon.jira { background: #0052CC; }
.integration-icon.slack { background: #4A154B; }
.integration-info h4 {
  margin: 0;
  text-transform: capitalize;
}
.integration-info p {
  margin: 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.integration-actions, .webhook-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.integration-actions .el-switch.is-disabled {
  cursor: pointer;
}
.webhook-url {
  font-size: 12px;
  padding: 4px 8px;
  background: var(--el-fill-color);
  border-radius: 4px;
}
.webhook-events {
  display: flex;
  gap: 4px;
  margin-top: 6px;
}
.add-integration, .add-webhook {
  margin-top: 8px;
}

.settings-card {
  margin-bottom: 24px;
}
.card-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}
.form-row {
  display: flex;
  gap: 24px;
}
.flex-1 {
  flex: 1;
}
.field-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
}
.info-icon {
    font-size: 14px;
    color: var(--el-text-color-secondary);
    cursor: help;
}
.danger-zone {
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid var(--el-border-color);
}
.danger-zone h3 {
  color: var(--el-color-danger);
  margin-bottom: 16px;
}
.danger-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border: 1px solid var(--el-color-danger);
  background: var(--el-color-danger-light-9);
  border-radius: 8px;
}
.danger-action h4 {
  margin: 0 0 4px;
  font-weight: 600;
  color: var(--el-color-danger);
}
.danger-action p {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

/* Integrations Styles */
.integration-item {
    display: flex;
    align-items: flex-start;
    padding: 8px 0;
}
.integration-card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
  border: 1px solid transparent;
}
.integration-card-row:hover {
    background: var(--el-fill-color);
    border-color: var(--el-border-color-light);
}
.integration-icon-small {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: white;
}
.integration-icon-small.github { background: #333; }
.integration-icon-small.jira { background: #0052CC; }
.integration-icon-small.slack { background: #4A154B; }

.site-icon {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: white;
}
.site-icon.github-small { background: #333; }
.site-icon.gitmesh-small { background: #6366f1; }

.checkbox-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.checkbox-list .el-checkbox {
  margin-right: 0;
  height: auto;
}
.custom-checkbox-label {
    color: var(--el-text-color-primary) !important;
    opacity: 1 !important;
    font-weight: normal;
}
.checkbox-list .el-checkbox__label {
    display: inline-block;
}
</style>
