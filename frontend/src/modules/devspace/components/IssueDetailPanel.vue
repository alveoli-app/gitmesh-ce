<template>
  <div class="issue-panel" v-if="issue">
    <div class="panel-header">
      <div class="header-row">
        <el-select
          v-model="localIssue.status"
          @change="updateStatus"
          size="small"
          class="status-select"
        >
          <el-option
            v-for="col in columns"
            :key="col.id"
            :label="col.label"
            :value="col.id"
          />
        </el-select>
        
        <el-select
          v-model="localIssue.priority"
          @change="updatePriority"
          size="small"
          class="priority-select"
        >
          <el-option label="Urgent" value="urgent" />
          <el-option label="High" value="high" />
          <el-option label="Medium" value="medium" />
          <el-option label="Low" value="low" />
        </el-select>
      </div>
      
      <div class="header-row">
        <div class="issue-id">#{{ issue.id.slice(0, 8) }}</div>
        <div class="actions">
            <!-- Add actions like delete, copy link here -->
        </div>
      </div>
    </div>

    <div class="panel-content">
      <div class="field-group">
        <el-input
          v-model="localIssue.title"
          class="title-input"
          placeholder="Issue Title"
          @blur="updateTitle"
        />
      </div>

      <div class="field-group description-section">
        <label>Description</label>
        <rich-text-editor
          v-model="localIssue.description"
          placeholder="Add a description..."
          @blur="updateDescription"
        />
      </div>

      <div class="field-group">
        <label>Details</label>
        <el-row :gutter="12">
            <el-col :span="12">
                <div class="detail-item">
                    <span class="label">Assignee</span>
                    <el-select 
                        v-model="selectedAssigneeId" 
                        filterable 
                        placeholder="Unassigned"
                        size="small"
                        @change="updateAssignee"
                        clearable
                    >
                        <el-option
                            v-for="member in teamMembers"
                            :key="member.id"
                            :label="member.name + (member.hasJoined ? '' : ' (Not joined)')"
                            :value="member.id"
                        />
                    </el-select>
                </div>
            </el-col>
            <el-col :span="12">
                <div class="detail-item">
                    <span class="label">Cycle</span>
                     <el-select 
                        v-model="localIssue.cycleId" 
                        placeholder="No Cycle"
                        size="small"
                        clearable
                        @change="updateCycle"
                    >
                        <el-option
                            v-for="cycle in cycles"
                            :key="cycle.id"
                            :label="cycle.name"
                            :value="cycle.id"
                        />
                    </el-select>
                </div>
            </el-col>
            <el-col :span="12" style="margin-top: 8px;">
                 <div class="detail-item">
                    <span class="label">Estimate (h)</span>
                    <el-input-number 
                        v-model="localIssue.estimatedHours" 
                        :min="0" 
                        :precision="1" 
                        size="small"
                        @change="updateHours"
                    />
                </div>
            </el-col>
             <el-col :span="12" style="margin-top: 8px;">
                 <div class="detail-item">
                    <span class="label">Actual (h)</span>
                    <el-input-number 
                        v-model="localIssue.actualHours" 
                        :min="0" 
                        :precision="1" 
                        size="small"
                        @change="updateHours"
                    />
                </div>
            </el-col>
        </el-row>
      </div>

      <!-- External Links (GitHub PRs) -->
      <div class="field-group" v-if="externalLinks.length > 0">
        <label>Linked Pull Requests</label>
        <div class="external-links-list">
            <a 
                v-for="link in externalLinks" 
                :key="link.id" 
                :href="link.url" 
                target="_blank"
                class="external-link-item"
            >
                <i class="ri-github-fill" style="color: #333;"></i>
                <div class="link-content">
                  <div class="link-title">
                    <span class="pr-number">#{{ link.externalId }}</span>
                    <span class="pr-title">{{ link.title || link.url }}</span>
                  </div>
                  <div class="link-meta">
                    <span :class="['pr-status', link.status]">
                      <i :class="getPRStatusIcon(link)"></i>
                      {{ getPRStatusLabel(link) }}
                    </span>
                    <span class="pr-repo" v-if="link.repository">
                      <i class="ri-git-repository-line"></i>
                      {{ link.repository }}
                    </span>
                  </div>
                </div>
                <i class="ri-external-link-line open-icon"></i>
            </a>
        </div>
      </div>

      <!-- Activity / Comments -->
      <div class="activity-section">
        <label>Activity</label>
        <div class="comments-list">
             <div v-for="comment in comments" :key="comment.id" class="comment-item">
                 <div class="comment-header">
                     <span class="author">{{ comment.author?.fullName || 'Unknown' }}</span>
                     <span class="time">{{ formatDate(comment.createdAt) }}</span>
                 </div>
                 <div class="comment-body">{{ comment.content }}</div>
             </div>
             <div v-if="comments.length === 0" class="no-comments">No comments yet</div>
        </div>
        
        <div class="add-comment">
            <el-input
                v-model="newComment"
                type="textarea"
                :rows="2"
                placeholder="Write a comment..."
            />
            <div class="comment-actions">
                <el-button 
                    type="primary" 
                    size="small" 
                    :disabled="!newComment.trim()"
                    @click="postComment"
                    :loading="postingComment"
                >
                    Comment
                </el-button>
            </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref, watch, onMounted } from 'vue';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import RichTextEditor from './RichTextEditor.vue';
import DevtelService from '@/modules/devspace/services/devtel-api';
import moment from 'moment';

export default {
  name: 'IssueDetailPanel',
  components: { RichTextEditor },
  props: {
    issueId: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const store = useStore();
    
    const issue = computed(() => store.getters['issues/selectedIssue']);
    const teamMembers = computed(() => store.getters['devspace/teamMembers']);
    const cycles = computed(() => store.getters['cycles/cycles']);
    
    // Local state for editing
    const localIssue = ref({});
    const selectedAssigneeId = ref(null);
    const comments = ref([]);
    const externalLinks = ref([]);
    const newComment = ref('');
    const postingComment = ref(false);

    const columns = [
      { id: 'backlog', label: 'Backlog' },
      { id: 'todo', label: 'To Do' },
      { id: 'in_progress', label: 'In Progress' },
      { id: 'review', label: 'Review' },
      { id: 'done', label: 'Done' },
    ];

    // Initialize local state from prop
    watch(issue, (newVal) => {
        if (newVal) {
            // Deep copy to break reactivity for editing
            localIssue.value = JSON.parse(JSON.stringify(newVal));
            
            // Set selected assignee - prefer user, then member
            if (newVal.assigneeId) {
                selectedAssigneeId.value = newVal.assigneeId;
            } else if (newVal.assigneeMemberId) {
                selectedAssigneeId.value = newVal.assigneeMemberId;
            } else {
                selectedAssigneeId.value = null;
            }
            
            // Convert description to TipTap format if it's a string
            if (localIssue.value.description && typeof localIssue.value.description === 'string') {
                try {
                    // Try to parse as JSON first (in case it's already stored as JSON string)
                    localIssue.value.description = JSON.parse(localIssue.value.description);
                } catch (e) {
                    // If not JSON, convert plain text to TipTap format
                    localIssue.value.description = {
                        type: 'doc',
                        content: [
                            {
                                type: 'paragraph',
                                content: [
                                    {
                                        type: 'text',
                                        text: localIssue.value.description
                                    }
                                ]
                            }
                        ]
                    };
                }
            } else if (!localIssue.value.description) {
                // Initialize empty TipTap document
                localIssue.value.description = {
                    type: 'doc',
                    content: []
                };
            }
            
            fetchComments();
            fetchExternalLinks();
        }
    }, { immediate: true });

    async function fetchComments() {
        if (!props.issueId) return;
        try {
            const data = await DevtelService.listIssueComments(issue.value.projectId, props.issueId);
            // Assuming API returns array or { rows: [] }
            comments.value = Array.isArray(data) ? data : (data.rows || []);
        } catch (e) {
            console.error('Failed to fetch comments', e);
        }
    }

    async function fetchExternalLinks() {
        if (!props.issueId) return;
        try {
            const data = await DevtelService.getIssueExternalLinks(props.issueId);
            externalLinks.value = data.links || [];
        } catch (e) {
            console.error('Failed to fetch external links', e);
            externalLinks.value = [];
        }
    }

    async function updateStatus() {
        if (localIssue.value.status === issue.value.status) return;
        await updateField({ status: localIssue.value.status });
    }

    async function updatePriority() {
        await updateField({ priority: localIssue.value.priority });
    }

    async function updateTitle() {
        if (localIssue.value.title === issue.value.title) return;
        await updateField({ title: localIssue.value.title });
    }

    async function updateDescription(content) {
         // Tiptap returns JSON object
        const contentStr = JSON.stringify(content);
        const currentStr = JSON.stringify(issue.value.description);
        
        if (contentStr === currentStr) return;
        
        localIssue.value.description = content; // Sync local
        // Store as JSON string in backend
        await updateField({ description: contentStr });
    }

    async function updateAssignee() {
        // Find the selected member to determine if it's a user or contact
        const member = teamMembers.value.find(m => m.id === selectedAssigneeId.value);
        
        if (!member && selectedAssigneeId.value) {
            // If no member found but ID is set, try to find by userId or memberId
            const memberByUserId = teamMembers.value.find(m => m.userId === selectedAssigneeId.value);
            const memberByMemberId = teamMembers.value.find(m => m.memberId === selectedAssigneeId.value);
            const foundMember = memberByUserId || memberByMemberId;
            
            if (foundMember) {
                const data = foundMember.hasJoined 
                    ? { assigneeId: foundMember.userId, assigneeMemberId: null }
                    : { assigneeMemberId: foundMember.memberId, assigneeId: null };
                await updateField(data);
                return;
            }
        }
        
        if (!selectedAssigneeId.value) {
            // Clearing assignee
            await updateField({ assigneeId: null, assigneeMemberId: null });
        } else if (member) {
            const data = member.hasJoined 
                ? { assigneeId: member.userId, assigneeMemberId: null }
                : { assigneeMemberId: member.memberId, assigneeId: null };
            await updateField(data);
        }
    }

    async function updateCycle() {
        await updateField({ cycleId: localIssue.value.cycleId });
    }

    async function updateHours() {
        await updateField({ 
            estimatedHours: localIssue.value.estimatedHours,
            actualHours: localIssue.value.actualHours
        });
    }

    async function updateField(data) {
        try {
            await store.dispatch('issues/updateIssue', {
                issueId: props.issueId,
                data: data,
            });
            ElMessage.success('Updated');
        } catch (error) {
            ElMessage.error('Failed to update issue');
            // Revert local state
            localIssue.value = JSON.parse(JSON.stringify(issue.value));
        }
    }

    async function postComment() {
        if (!newComment.value.trim()) return;
        postingComment.value = true;
        try {
            await DevtelService.createIssueComment(issue.value.projectId, props.issueId, newComment.value);
            newComment.value = '';
            await fetchComments();
            ElMessage.success('Comment added');
        } catch (error) {
            ElMessage.error('Failed to post comment');
        } finally {
            postingComment.value = false;
        }
    }

    function getLinkIcon(type) {
         switch (type) {
            case 'github_pr': return 'ri-github-fill';
            case 'github_issue': return 'ri-github-line';
            case 'gitlab_mr': return 'ri-gitlab-fill';
            case 'figma': return 'ri-pen-nib-fill';
            default: return 'ri-links-line';
        }
    }

    function getPRStatusIcon(link) {
        if (link.merged) return 'ri-git-merge-line';
        if (link.status === 'open') return 'ri-git-pull-request-line';
        return 'ri-close-circle-line';
    }

    function getPRStatusLabel(link) {
        if (link.merged) return 'Merged';
        if (link.status === 'open') return 'Open';
        return 'Closed';
    }

    function formatDate(date) {
        return moment(date).fromNow();
    }

    return {
        issue,
        localIssue,
        selectedAssigneeId,
        teamMembers,
        cycles,
        columns,
        comments,
        externalLinks,
        newComment,
        postingComment,
        updateStatus,
        updatePriority,
        updateTitle,
        updateDescription,
        updateAssignee,
        updateCycle,
        updateHours,
        postComment,
        getLinkIcon,
        getPRStatusIcon,
        getPRStatusLabel,
        formatDate,
    };
  }
}
</script>

<style scoped>
.issue-panel {
    padding-bottom: 20px;
}
.panel-header {
    margin-bottom: 24px;
}
.header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}
.status-select {
    width: 140px;
}
.priority-select {
    width: 100px;
}
.issue-id {
    font-family: monospace;
    color: var(--el-text-color-secondary);
}
.title-input {
    font-size: 18px;
    font-weight: 600;
}
:deep(.title-input .el-input__wrapper) {
    box-shadow: none;
    padding-left: 0;
}
:deep(.title-input .el-input__inner) {
    font-size: 18px;
    font-weight: 600;
}

.field-group {
    margin-bottom: 24px;
}
.field-group label {
    display: block;
    margin-bottom: 8px;
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-secondary);
    text-transform: uppercase;
}
.detail-item {
    background: var(--el-fill-color-light);
    padding: 8px 12px;
    border-radius: 6px;
}
.detail-item .label {
    display: block;
    font-size: 11px;
    color: var(--el-text-color-secondary);
    margin-bottom: 4px;
}

.external-link-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    border: 1px solid var(--el-border-color);
    border-radius: 4px;
    margin-bottom: 4px;
    text-decoration: none;
    color: var(--el-text-color-primary);
    transition: background 0.2s;
}
.external-link-item:hover {
    background: var(--el-fill-color-light);
}
.external-link-item i {
    font-size: 16px;
}
.link-url {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
}
.link-content {
    flex: 1;
    min-width: 0;
}
.link-title {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
}
.pr-number {
    font-weight: 600;
    color: var(--el-color-primary);
}
.pr-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
}
.link-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
}
.pr-status {
    display: inline-flex;
    align-items: center;
    gap: 4px;
}
.pr-status.open {
    color: #22863a;
}
.pr-status.closed {
    color: #d73a49;
}
.pr-status i {
    font-size: 14px;
}
.pr-repo {
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.activity-section {
    border-top: 1px solid var(--el-border-color);
    padding-top: 24px;
}
.comments-list {
    margin-bottom: 16px;
}
.comment-item {
    padding: 12px;
    background: var(--el-fill-color-light);
    border-radius: 6px;
    margin-bottom: 8px;
}
.comment-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
    font-size: 12px;
}
.author {
    font-weight: 600;
}
.time {
    color: var(--el-text-color-secondary);
}
.comment-body {
    font-size: 14px;
    line-height: 1.5;
}
.add-comment {
    margin-top: 16px;
}
.comment-actions {
    margin-top: 8px;
    text-align: right;
}
</style>
