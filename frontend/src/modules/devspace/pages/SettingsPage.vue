<template>
  <div class="settings-page devspace-page">
    <div class="page-header">
      <h1>Settings</h1>
    </div>

    <div class="settings-layout">
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
          <h2>General Settings</h2>
          <el-form label-position="top" class="settings-form">
            <el-form-item label="Project Name">
              <el-input v-model="settings.projectName" placeholder="Project name" />
            </el-form-item>
            <el-form-item label="Project Key">
              <el-input v-model="settings.projectKey" placeholder="e.g., PROJ" />
            </el-form-item>
            <el-form-item label="Default Cycle Length">
              <el-select v-model="settings.cycleLength" style="width: 100%">
                <el-option :value="7" label="1 Week" />
                <el-option :value="14" label="2 Weeks" />
                <el-option :value="21" label="3 Weeks" />
                <el-option :value="30" label="1 Month" />
              </el-select>
            </el-form-item>
            <el-form-item label="Story Point Scale">
              <el-select v-model="settings.storyPointScale" style="width: 100%">
                <el-option value="fibonacci" label="Fibonacci (1, 2, 3, 5, 8, 13)" />
                <el-option value="linear" label="Linear (1-10)" />
                <el-option value="tshirt" label="T-Shirt (XS, S, M, L, XL)" />
              </el-select>
            </el-form-item>
            <el-button type="primary" @click="saveGeneralSettings">Save Changes</el-button>
          </el-form>
        </div>

        <!-- Integrations -->
        <div v-show="activeSection === 'integrations'" class="settings-section">
          <h2>Integrations</h2>
          <div class="integrations-list">
            <div v-for="integration in integrations" :key="integration.id" class="integration-card">
              <div class="integration-info">
                <div class="integration-icon" :class="integration.provider">
                  {{ integration.provider.charAt(0).toUpperCase() }}
                </div>
                <div>
                  <h4>{{ integration.provider }}</h4>
                  <p>{{ integration.status }}</p>
                </div>
              </div>
              <div class="integration-actions">
                <el-tag :type="integration.status === 'connected' ? 'success' : 'info'">
                  {{ integration.status }}
                </el-tag>
                <el-button size="small" @click="testIntegration(integration)">Test</el-button>
                <el-button size="small" type="danger" @click="removeIntegration(integration)">Remove</el-button>
              </div>
            </div>
            <div class="add-integration">
              <el-button @click="showAddIntegration = true">
                <el-icon><Plus /></el-icon>
                Add Integration
              </el-button>
            </div>
          </div>
        </div>

        <!-- AI Settings -->
        <div v-show="activeSection === 'ai'" class="settings-section">
          <h2>AI Agent Settings</h2>
          <el-form label-position="top" class="settings-form">
            <el-form-item label="Enabled Agents">
              <el-checkbox-group v-model="aiSettings.enabledAgents">
                <el-checkbox label="prioritize">Issue Prioritization</el-checkbox>
                <el-checkbox label="suggest-sprint">Sprint Suggestions</el-checkbox>
                <el-checkbox label="breakdown">Issue Breakdown</el-checkbox>
                <el-checkbox label="assignee">Assignee Suggestions</el-checkbox>
                <el-checkbox label="generate-spec">Spec Generation</el-checkbox>
              </el-checkbox-group>
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
          <div class="webhooks-list">
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

    <!-- Add Integration Modal -->
    <el-dialog v-model="showAddIntegration" title="Add Integration" width="500px">
      <el-form label-position="top">
        <el-form-item label="Provider">
          <el-select v-model="newIntegration.provider" style="width: 100%">
            <el-option value="github" label="GitHub" />
            <el-option value="jira" label="Jira" />
            <el-option value="slack" label="Slack" />
          </el-select>
        </el-form-item>
        <el-form-item label="API Token">
          <el-input v-model="newIntegration.token" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddIntegration = false">Cancel</el-button>
        <el-button type="primary" @click="addIntegration">Connect</el-button>
      </template>
    </el-dialog>

    <!-- Add Webhook Modal -->
    <el-dialog v-model="showAddWebhook" title="Add Webhook" width="500px">
      <el-form label-position="top">
        <el-form-item label="URL">
          <el-input v-model="newWebhook.url" placeholder="https://..." />
        </el-form-item>
        <el-form-item label="Events">
          <el-checkbox-group v-model="newWebhook.events">
            <el-checkbox label="issue.created">Issue Created</el-checkbox>
            <el-checkbox label="issue.updated">Issue Updated</el-checkbox>
            <el-checkbox label="cycle.started">Cycle Started</el-checkbox>
            <el-checkbox label="cycle.completed">Cycle Completed</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddWebhook = false">Cancel</el-button>
        <el-button type="primary" @click="addWebhook">Create</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { Setting, Link, Cpu, Connection, Plus, Lock } from '@element-plus/icons-vue';
import DevtelService from '@/modules/devspace/services/devtel-api';

export default {
  name: 'SettingsPage',
  components: { Setting, Link, Cpu, Connection, Plus, Lock },
  data() {
    return {
      activeSection: 'general',
      sections: [
        { id: 'general', label: 'General', icon: 'Setting' },
        { id: 'integrations', label: 'Integrations', icon: 'Link' },
        { id: 'ai', label: 'AI Agents', icon: 'Cpu' },
        { id: 'webhooks', label: 'Webhooks', icon: 'Connection' },
        { id: 'access', label: 'Access Control', icon: 'Lock' },
      ],
      settings: {
        projectName: '',
        projectKey: '',
        cycleLength: 14,
        storyPointScale: 'fibonacci',
      },
      integrations: [],
      webhooks: [],
      aiSettings: {
        enabledAgents: ['prioritize', 'suggest-sprint'],
        approvalRequired: true,
        temperature: 0.7,
      },
      showAddIntegration: false,
      showAddWebhook: false,
      newIntegration: { provider: 'github', token: '' },
      newWebhook: { url: '', events: [] },
    };
  },
  computed: {
    projectId() {
      return this.$store.getters['devspace/activeProject']?.id;
    },
    workspaceId() {
      return this.$store.getters['devspace/activeWorkspace']?.id;
    },
  },
  watch: {
    workspaceId: {
      immediate: true,
      handler(val) {
        if (val) this.fetchSettings();
      },
    },
  },
  methods: {
    async fetchSettings() {
      if (!this.workspaceId) return;
      try {
        const [integrations, webhooks, aiSettings] = await Promise.all([
          DevtelService.listIntegrations(this.workspaceId),
          DevtelService.listWebhooks(this.workspaceId),
          DevtelService.getAgentSettings(this.workspaceId),
        ]);
        this.integrations = integrations.rows || [];
        this.webhooks = webhooks.rows || [];
        if (aiSettings) {
          this.aiSettings = { ...this.aiSettings, ...aiSettings };
        }

        // Fetch General Settings
        const generalSettings = await DevtelService.getGeneralSettings(this.workspaceId);
        if (generalSettings) {
            this.settings = { ...this.settings, ...generalSettings };
        }
      } catch (e) {
        console.error('Failed to fetch settings', e);
      }
    },
    async saveGeneralSettings() {
        try {
            await DevtelService.updateGeneralSettings(this.workspaceId, this.settings);
            this.$message.success('Settings saved');
        } catch (e) {
            this.$message.error('Failed to save settings');
        }
    },
    async saveAiSettings() {
      try {
        await DevtelService.updateAgentSettings(this.workspaceId, this.aiSettings);
        this.$message.success('AI settings saved');
      } catch (e) {
        this.$message.error('Failed to save');
      }
    },
    async addIntegration() {
      try {
        const integration = await DevtelService.createIntegration(this.workspaceId, {
          provider: this.newIntegration.provider,
          credentials: { token: this.newIntegration.token },
        });
        this.integrations.push(integration);
        this.showAddIntegration = false;
        this.newIntegration = { provider: 'github', token: '' };
        this.$message.success('Integration added');
      } catch (e) {
        this.$message.error('Failed to connect');
      }
    },
    async testIntegration(integration) {
      try {
        await DevtelService.testIntegration(this.workspaceId, integration.id);
        this.$message.success('Connection successful');
      } catch (e) {
        this.$message.error('Connection failed');
      }
    },
    async removeIntegration(integration) {
      try {
        await DevtelService.deleteIntegration(this.workspaceId, integration.id);
        this.integrations = this.integrations.filter(i => i.id !== integration.id);
        this.$message.success('Integration removed');
      } catch (e) {
        this.$message.error('Failed to remove');
      }
    },
    async addWebhook() {
      try {
        const webhook = await DevtelService.createWebhook(this.workspaceId, this.newWebhook);
        this.webhooks.push(webhook);
        this.showAddWebhook = false;
        this.newWebhook = { url: '', events: [] };
        this.$message.success('Webhook created');
      } catch (e) {
        this.$message.error('Failed to create');
      }
    },
    async toggleWebhook(webhook) {
      try {
        await DevtelService.updateWebhook(this.workspaceId, webhook.id, { enabled: webhook.enabled });
      } catch (e) {
        webhook.enabled = !webhook.enabled;
      }
    },
    async removeWebhook(webhook) {
      try {
        await DevtelService.deleteWebhook(this.workspaceId, webhook.id);
        this.webhooks = this.webhooks.filter(w => w.id !== webhook.id);
        this.$message.success('Webhook deleted');
      } catch (e) {
        this.$message.error('Failed to delete');
      }
    },
  },
};
</script>

<style scoped>
@import '../styles/devspace-common.css';

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
  margin: 0 0 20px;
  font-size: 18px;
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
</style>
