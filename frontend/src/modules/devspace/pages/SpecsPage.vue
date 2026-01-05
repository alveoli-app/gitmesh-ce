<template>
  <div class="specs-page devspace-page">
    <div class="page-header">
      <h1>Specs & Documentation</h1>
      <div class="header-actions">
        <el-input
          v-model="searchQuery"
          placeholder="Search specs..."
          prefix-icon="Search"
          clearable
          style="width: 240px"
          @input="handleSearch"
        />
        <el-button type="primary" @click="showCreateModal = true">
          <el-icon><Plus /></el-icon>
          New Spec
        </el-button>
      </div>
    </div>

    <!-- No Project Connected State -->
    <div v-if="!projectId" class="no-project-state">
      <div class="no-project-content">
        <i class="ri-folder-add-line no-project-icon"></i>
        <h2>No Project Connected</h2>
        <p>Connect a project to start creating and managing specs and documentation.</p>
      </div>
    </div>

    <div v-else-if="loading" class="loading-state">
      <el-skeleton :rows="5" animated />
    </div>

    <template v-else>
      <div class="specs-grid">
        <div 
          v-for="spec in specs" 
          :key="spec.id" 
          class="spec-card"
        >
          <div class="spec-header">
            <el-icon class="spec-icon" @click="openSpec(spec)"><Document /></el-icon>
            <div class="spec-header-right">
              <el-tag 
                :type="getStatusType(spec.status)" 
                size="small"
                @click="openSpec(spec)"
              >
                {{ spec.status }}
              </el-tag>
              <el-dropdown @command="(command) => handleSpecAction(command, spec)" trigger="click">
                <el-button type="text" size="small" class="spec-menu-btn" @click.stop>
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="delete" class="delete-item">
                      <el-icon><Delete /></el-icon>
                      Delete
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
          <h3 class="spec-title" @click="openSpec(spec)">{{ spec.title }}</h3>
          <p class="spec-preview" @click="openSpec(spec)">{{ getPreview(spec.content) }}</p>
          <div class="spec-footer" @click="openSpec(spec)">
            <div class="spec-author">
              <el-avatar :size="20">{{ spec.author?.name?.charAt(0) || 'A' }}</el-avatar>
              <span>{{ spec.author?.name || 'Unknown' }}</span>
            </div>
            <span class="spec-date">{{ formatDate(spec.updatedAt) }}</span>
          </div>
        </div>
      </div>

      <div v-if="specs.length === 0" class="empty-state">
        <el-empty description="No specs yet">
          <el-button type="primary" @click="showCreateModal = true">Create First Spec</el-button>
        </el-empty>
      </div>
    </template>

    <!-- Create Modal -->
    <el-dialog v-model="showCreateModal" title="Create Spec" width="600px" class="create-spec-modal">
      <el-form :model="newSpec" label-position="top" class="create-spec-form">
        <el-form-item label="Title" required>
          <el-input v-model="newSpec.title" placeholder="Spec title" />
        </el-form-item>
        <el-form-item label="Status">
          <el-select v-model="newSpec.status" style="width: 100%">
            <el-option value="draft" label="Draft" />
            <el-option value="review" label="In Review" />
            <el-option value="approved" label="Approved" />
          </el-select>
        </el-form-item>
        <el-form-item label="Content" class="content-form-item">
          <rich-text-editor
            v-model="newSpec.contentText"
            placeholder="Write your spec content here..."
            :min-height="'300px'"
            class="spec-editor"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateModal = false">Cancel</el-button>
        <el-button type="primary" @click="createSpec" :loading="creating">Create</el-button>
      </template>
    </el-dialog>

    <!-- Spec Detail Drawer -->
    <el-drawer 
        v-model="showSpecDrawer" 
        :title="selectedSpec?.title" 
        size="80%" 
        :before-close="closeSpecDrawer"
        destroy-on-close
    >
      <template #header="{ titleId, titleClass }">
        <div class="drawer-header">
          <h4 :id="titleId" :class="titleClass">{{ selectedSpec?.title }}</h4>
          <el-button 
            type="danger" 
            size="small" 
            @click="handleSpecAction('delete', selectedSpec)"
            :icon="Delete"
            :loading="deleting"
          >
            Delete
          </el-button>
        </div>
      </template>
      <div v-if="selectedSpec" class="spec-drawer-content">
        <div class="spec-main">
          <div class="detail-meta">
            <el-tag :type="getStatusType(selectedSpec.status)">{{ selectedSpec.status }}</el-tag>
            <span>by {{ selectedSpec.author?.name }}</span>
            <span>•</span>
            <span>Updated {{ formatDate(selectedSpec.updatedAt) }}</span>
            <div class="viewers-list" v-if="viewers.length > 0">
                <el-tooltip v-for="viewer in viewers" :key="viewer.socketId" :content="viewer.name">
                    <el-avatar :size="24" class="viewer-avatar">{{ viewer.name.charAt(0) }}</el-avatar>
                </el-tooltip>
            </div>
          </div>
          
          <rich-text-editor 
            v-model="selectedSpec.content" 
            :editable="true"
            @blur="updateSpecContent"
            placeholder="Start writing spec..."
          />
        </div>
        
        <div class="spec-sidebar">
           <el-tabs type="border-card" class="sidebar-tabs">
             <el-tab-pane label="Comments">
                <div class="comments-list">
                    <div v-for="comment in specComments" :key="comment.id" class="comment">
                      <el-avatar :size="32">{{ comment.author?.name?.charAt(0) }}</el-avatar>
                      <div class="comment-body">
                        <div class="comment-header">
                          <span class="comment-author">{{ comment.author?.name }}</span>
                          <span class="comment-date">{{ formatDate(comment.createdAt) }}</span>
                        </div>
                        <p class="comment-text">{{ comment.content }}</p>
                      </div>
                    </div>
                </div>
                <div class="add-comment">
                  <el-input v-model="newComment" type="textarea" :rows="2" placeholder="Add comment..." />
                  <el-button type="primary" size="small" @click="addComment" :disabled="!newComment.trim()">
                    Comment
                  </el-button>
                </div>
             </el-tab-pane>
             
             <el-tab-pane label="Versions">
                 <div class="versions-list">
                     <div v-for="v in versions" :key="v.id" class="version-item">
                         <div class="version-date">{{ formatDate(v.createdAt) }}</div>
                         <div class="version-author">{{ v.author?.name }}</div>
                     </div>
                     <div v-if="versions.length === 0" class="empty-text">No history yet</div>
                 </div>
             </el-tab-pane>
           </el-tabs>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script>
import { Document, Plus, Search, Delete, MoreFilled } from '@element-plus/icons-vue';
import { ElMessageBox, ElMessage } from 'element-plus';
import { useProject } from '@/modules/devspace/composables/useProject';
import DevtelService from '@/modules/devspace/services/devtel-api';
import RichTextEditor from '../components/RichTextEditor.vue';

export default {
  name: 'SpecsPage',
  components: { Document, Plus, Search, Delete, MoreFilled, RichTextEditor },
  setup() {
    const { activeProjectId } = useProject();
    return { activeProjectId };
  },
  data() {
    return {
      loading: true,
      specs: [],
      searchQuery: '',
      showCreateModal: false,
      showSpecDrawer: false,
      creating: false,
      deleting: false,
      selectedSpec: null,
      specToDelete: null,
      specComments: [],
      versions: [],
      viewers: [],
      newComment: '',
      newSpec: {
        title: '',
        status: 'draft',
        contentText: {
          type: 'doc',
          content: []
        },
      },
    };
  },
  computed: {
    projectId() {
      return this.activeProjectId;
    },
  },
  mounted() {
    if (this.projectId) {
      this.fetchSpecs();
    } else {
      this.loading = false;
    }
    // Add keyboard event listener for delete shortcut
    document.addEventListener('keydown', this.handleKeydown);
  },
  beforeUnmount() {
    // Remove keyboard event listener
    document.removeEventListener('keydown', this.handleKeydown);
  },
  methods: {
    async fetchSpecs() {
      if (!this.projectId) return;
      this.loading = true;
      try {
        const data = await DevtelService.listSpecs(this.projectId, { search: this.searchQuery });
        this.specs = data.rows || [];
      } catch (e) {
        console.error('Failed to fetch specs', e);
        ElMessage.error('Failed to load specs');
      } finally {
        this.loading = false;
      }
    },
    async createSpec() {
      if (!this.newSpec.title) return;
      this.creating = true;
      try {
        const payload = {
          title: this.newSpec.title,
          status: this.newSpec.status,
          content: this.newSpec.contentText || {}, // Send as JSON object, fallback to empty object
        };
        const spec = await DevtelService.createSpec(this.projectId, payload);
        this.specs.unshift(spec);
        this.showCreateModal = false;
        this.newSpec = { title: '', status: 'draft', contentText: { type: 'doc', content: [] } };
        ElMessage.success('Spec created successfully');
      } catch (e) {
        console.error('Failed to create spec', e);
        ElMessage.error('Failed to create spec');
      } finally {
        this.creating = false;
      }
    },
    openSpec(spec) {
      this.selectedSpec = spec;
      this.showSpecDrawer = true;
      this.specComments = [];
      this.versions = [];
      this.viewers = []; // Reset viewers
      this.fetchSpecVersions(spec.id);
      
      // Join presence room
      if (this.$devtelSocket) {
          this.$devtelSocket.joinSpec(spec.id);
          this.$devtelSocket.on('spec:viewer-joined', this.handleViewerJoined);
          this.$devtelSocket.on('spec:viewer-left', this.handleViewerLeft);
      }
    },
    handleViewerJoined(data) {
        // Prevent duplicate
        if (!this.viewers.find(v => v.userId === data.userId)) {
            this.viewers.push({ userId: data.userId, socketId: data.socketId, name: 'User ' + data.userId.slice(0, 4) }); 
            // Name is placeholder as we don't have full user details from socket event yet without lookup
        }
    },
    handleViewerLeft(data) {
        this.viewers = this.viewers.filter(v => v.socketId !== data.socketId);
    },
    closeSpecDrawer() {
        if (this.selectedSpec && this.$devtelSocket) {
            this.$devtelSocket.leaveSpec(this.selectedSpec.id);
            this.$devtelSocket.off('spec:viewer-joined', this.handleViewerJoined);
            this.$devtelSocket.off('spec:viewer-left', this.handleViewerLeft);
        }
        this.showSpecDrawer = false;
        this.selectedSpec = null;
    },
    async updateSpecContent(content) {
        if (!this.selectedSpec || JSON.stringify(content) === JSON.stringify(this.selectedSpec.content)) return;
        try {
            await DevtelService.updateSpec(this.projectId, this.selectedSpec.id, { content });
            this.selectedSpec.content = content;
        } catch (e) {
            console.error('Failed to update spec', e);
        }
    },
    async fetchSpecVersions(specId) {
        try {
            // Mock or fetch
            this.versions = await DevtelService.listSpecVersions(this.projectId, specId);
        } catch (e) {
            this.versions = [];
        }
    },
    async addComment() {
      if (!this.newComment.trim() || !this.selectedSpec) return;
      try {
          await DevtelService.createSpecComment(this.projectId, this.selectedSpec.id, this.newComment);
          this.specComments.push({
              id: Date.now(),
              content: this.newComment,
              author: { name: 'Me' }, // Replace with current user
              createdAt: new Date()
          });
          this.newComment = '';
      } catch (e) {
          console.error('Failed to add comment', e);
      }
    },
    handleSearch() {
      this.fetchSpecs();
    },
    handleKeydown(event) {
      // Delete key when spec drawer is open
      if (event.key === 'Delete' && this.showSpecDrawer && this.selectedSpec) {
        event.preventDefault();
        this.confirmDeleteSpec(this.selectedSpec);
      }
    },
    handleSpecAction(command, spec) {
      if (command === 'delete') {
        this.confirmDeleteSpec(spec);
      }
    },
    confirmDeleteSpec(spec) {
      ElMessageBox.confirm(
        `Are you sure you want to delete "${spec.title}"? This action cannot be undone.`,
        'Delete Spec',
        {
          confirmButtonText: 'Delete',
          cancelButtonText: 'Cancel',
          type: 'warning',
          confirmButtonClass: 'el-button--danger',
        }
      ).then(() => {
        this.deleteSpec(spec);
      }).catch(() => {
        // User cancelled
      });
    },
    async deleteSpec(spec) {
      this.deleting = true;
      try {
        await DevtelService.deleteSpec(this.projectId, spec.id);
        
        // Remove from specs list
        this.specs = this.specs.filter(s => s.id !== spec.id);
        
        // Close drawer if this spec is currently open
        if (this.selectedSpec && this.selectedSpec.id === spec.id) {
          this.closeSpecDrawer();
        }
        
        ElMessage.success('Spec deleted successfully');
      } catch (e) {
        console.error('Failed to delete spec', e);
        ElMessage.error('Failed to delete spec');
      } finally {
        this.deleting = false;
      }
    },
    getStatusType(status) {
      const types = { draft: 'info', review: 'warning', approved: 'success' };
      return types[status] || 'info';
    },
    getPreview(content) {
      if (!content) return '';
      
      // If content is a JSON object (Tiptap format), extract text
      if (typeof content === 'object') {
        const extractText = (node) => {
          let text = '';
          if (node.text) {
            text += node.text;
          }
          if (node.content && Array.isArray(node.content)) {
            text += node.content.map(extractText).join('');
          }
          return text;
        };
        return extractText(content);
      }
      
      // Fallback for HTML strings (legacy support)
      const tmp = document.createElement("DIV");
      tmp.innerHTML = content;
      return tmp.textContent || tmp.innerText || "";
    },
    renderContent(content) {
      return content;
    },
    formatDate(date) {
      if (!date) return '';
      return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },
  },
};
</script>

<style scoped>
@import '../styles/devspace-common.css';

.specs-page {
  padding: 24px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}
.header-actions {
  display: flex;
  gap: 12px;
}
.specs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.spec-card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s;
  position: relative;
}
.spec-card:hover {
  border-color: var(--el-color-primary);
  background-color: #18181b;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}
.spec-title, .spec-preview, .spec-footer, .spec-icon {
  cursor: pointer;
}
.spec-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.spec-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.spec-menu-btn {
  padding: 4px;
  color: var(--el-text-color-secondary);
  opacity: 0;
  transition: opacity 0.2s;
}
.spec-card:hover .spec-menu-btn {
  opacity: 1;
}
.spec-menu-btn:hover {
  color: var(--el-text-color-primary);
  background-color: var(--el-fill-color-light);
}
.delete-item {
  color: var(--el-color-danger);
}
.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
.drawer-header h4 {
  margin: 0;
  flex: 1;
}
.spec-icon {
  font-size: 20px;
  color: var(--el-color-primary);
}
.spec-title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
}
.spec-preview {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.spec-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.spec-author {
  display: flex;
  align-items: center;
  gap: 6px;
}
.spec-drawer-content {
  display: flex;
  height: 100%;
}
.spec-main {
    flex: 1;
    padding: 24px;
    overflow-y: auto;
    border-right: 1px solid var(--el-border-color-light);
}
.spec-sidebar {
    width: 300px;
    display: flex;
    flex-direction: column;
    background: var(--el-bg-color-page);
}
.sidebar-tabs {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}
.detail-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.viewers-list {
    display: flex;
    margin-left: auto;
    gap: -8px; 
}
.viewer-avatar {
    border: 2px solid var(--el-bg-color);
    margin-left: -8px;
}
.viewer-avatar:first-child {
    margin-left: 0;
}
.comments-list {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
}
.comment {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}
.comment-body {
  flex: 1;
}
.comment-header {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
}
.comment-author {
  font-weight: 500;
}
.comment-date {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.comment-text {
  margin: 0;
  font-size: 14px;
}
.add-comment {
  padding: 16px;
  border-top: 1px solid var(--el-border-color-light);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.add-comment .el-button {
  align-self: flex-end;
}
.versions-list {
    padding: 16px;
    overflow-y: auto;
    flex: 1;
}
.version-item {
    padding: 12px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    cursor: pointer;
}
.version-item:hover {
    background: var(--el-fill-color-light);
}
.version-date {
    font-size: 13px;
    font-weight: 500;
}
.version-author {
    font-size: 12px;
    color: var(--el-text-color-secondary);
}
.empty-state {
  padding: 60px 0;
}
.loading-state {
  padding: 40px 0;
}

/* No Project State */
.no-project-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 40px;
}
.no-project-content {
  text-align: center;
  max-width: 400px;
}
.no-project-icon {
  font-size: 64px;
  color: var(--el-text-color-placeholder);
  margin-bottom: 24px;
}
.no-project-content h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: var(--el-text-color-primary);
}
.no-project-content p {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin: 0 0 24px 0;
  line-height: 1.6;
}

/* Create Spec Modal Styles */
.create-spec-modal :deep(.el-dialog__body) {
  padding: 20px;
}

.create-spec-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.content-form-item {
  display: flex;
  flex-direction: column;
}

.content-form-item :deep(.el-form-item__label) {
  margin-bottom: 8px;
}

.content-form-item :deep(.el-form-item__content) {
  display: flex !important;
  flex-direction: column !important;
  min-height: 300px !important;
}

.spec-editor {
  width: 100%;
  min-height: 300px !important;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  overflow: hidden;
}

.spec-editor :deep(.rich-text-editor) {
  min-height: 300px !important;
  border: none;
}

.spec-editor :deep(.editor-content) {
  min-height: 250px !important;
  overflow-y: auto !important;
}

.spec-editor :deep(.ProseMirror) {
  min-height: 250px !important;
}
</style>
