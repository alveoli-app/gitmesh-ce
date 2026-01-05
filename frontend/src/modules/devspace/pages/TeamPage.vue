<template>
  <div class="team-page devspace-page">
    <div class="page-header">
      <div class="header-left">
        <h1>Team (Connected to Contacts)</h1>
        <div class="datasource-info">
          <span class="datasource-label">Data source:</span>
          <router-link :to="contactsPageUrl" class="datasource-link">
            <span class="ri-contacts-line"></span>
            Contacts (Team Members)
          </router-link>
        </div>
      </div>
      <div class="header-actions">
        <el-select
          v-model="selectedOrganization"
          placeholder="Filter by organization"
          clearable
          style="width: 200px; margin-right: 12px"
          @change="handleOrganizationChange"
        >
          <el-option
            v-for="org in organizations"
            :key="org.id"
            :label="org.displayName || org.name"
            :value="org.id"
          />
        </el-select>
        <el-input
          v-model="searchQuery"
          placeholder="Search members..."
          prefix-icon="Search"
          clearable
          style="width: 200px"
          @input="handleSearch"
        />
        <el-button type="primary" style="margin-left: 12px" @click="showAddMemberDialog = true">
          <i class="ri-user-add-line"></i> Add Team Member
        </el-button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <el-skeleton :rows="5" animated />
    </div>

    <template v-else>
      <div class="team-stats">
        <div class="stat-card">
          <div class="stat-value">{{ totalMembers }}</div>
          <div class="stat-label">Team Members</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ analytics.issuesCompleted || 0 }}</div>
          <div class="stat-label">Issues Completed</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ analytics.avgVelocity || 0 }}</div>
          <div class="stat-label">Avg Velocity</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ analytics.avgCycleTime || 0 }}d</div>
          <div class="stat-label">Avg Cycle Time</div>
        </div>
      </div>

      <div class="team-grid">
        <div v-for="member in filteredMembers" :key="member.id" class="member-card" :class="{ 'is-current-user': isCurrentUser(member) }">
          <div class="member-avatar">
            <el-avatar :size="64" :src="member.attributes?.avatarUrl?.default">
              {{ getInitials(member) }}
            </el-avatar>
          </div>
          <div class="member-info">
            <h3 class="member-name">
              {{ member.displayName || member.fullName || getPrimaryEmail(member) || 'Unknown' }}
              <span v-if="isCurrentUser(member)" class="me-badge">(You)</span>
            </h3>
            <p class="member-email">{{ getPrimaryEmail(member) }}</p>
            <p v-if="member.attributes?.jobTitle?.default" class="member-title">
              {{ member.attributes.jobTitle.default }}
            </p>
          </div>
          
          <div v-if="member.organizations?.length" class="member-orgs">
            <el-tag 
              v-for="org in member.organizations.slice(0, 2)" 
              :key="org.id"
              size="small"
              type="info"
            >
              {{ org.displayName || org.name }}
            </el-tag>
            <span v-if="member.organizations.length > 2" class="more-orgs">
              +{{ member.organizations.length - 2 }}
            </span>
          </div>

          <div class="member-stats">
            <div class="stat">
              <span class="stat-num">{{ member.activityCount || 0 }}</span>
              <span class="stat-label">Activities</span>
            </div>
            <div class="stat">
              <span class="stat-num">{{ member.score || 0 }}</span>
              <span class="stat-label">Score</span>
            </div>
            <div class="stat">
              <span class="stat-num">{{ formatDate(member.lastActive) }}</span>
              <span class="stat-label">Last Active</span>
            </div>
          </div>

          <div class="member-actions">
            <el-button size="small" @click="viewProfile(member)">View Profile</el-button>
            <router-link :to="{ name: 'memberView', params: { id: member.id } }">
              <el-button size="small" type="primary" plain>View in Contacts</el-button>
            </router-link>
          </div>
        </div>
      </div>

      <div v-if="filteredMembers.length === 0 && !loading" class="empty-state">
        <el-empty description="No team members found">
          <template #description>
            <p>No team members found in contacts.</p>
            <p class="empty-hint">
              You can add team members in two ways:
            </p>
            <ul class="empty-options">
              <li>Click "Add Team Member" to create a new contact as a team member</li>
              <li>Go to <router-link :to="{ name: 'member' }">Contacts</router-link> and mark existing contacts as team members</li>
            </ul>
          </template>
          <el-button type="primary" @click="showAddMemberDialog = true">
            <i class="ri-user-add-line"></i> Add Team Member
          </el-button>
        </el-empty>
      </div>

      <div v-if="totalMembers > pageSize" class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="totalMembers"
          layout="prev, pager, next"
          @current-change="handlePageChange"
        />
      </div>
    </template>

    <!-- Add Team Member Dialog -->
    <el-dialog v-model="showAddMemberDialog" title="Add Team Member" width="500px">
      <div class="add-member-content">
        <p class="add-member-description">
          Create a new contact and add them as a team member.
        </p>
        
        <el-form :model="newContactForm" label-position="top">
          <el-form-item label="Display Name" required>
            <el-input v-model="newContactForm.displayName" placeholder="John Doe" />
          </el-form-item>
          <el-form-item label="Email" required>
            <el-input v-model="newContactForm.email" placeholder="john@example.com" type="email" />
          </el-form-item>
        </el-form>
      </div>
      
      <template #footer>
        <el-button @click="showAddMemberDialog = false">Cancel</el-button>
        <el-button 
          type="primary" 
          :loading="addingMember"
          :disabled="!newContactForm.displayName || !newContactForm.email"
          @click="createNewTeamMember"
        >
          Create Team Member
        </el-button>
      </template>
    </el-dialog>

    <!-- Profile Drawer -->
    <el-drawer v-model="showProfileDrawer" :title="selectedMember?.displayName || 'Profile'" size="400px">
      <template v-if="selectedMember">
        <div class="profile-content">
          <div class="profile-header">
            <el-avatar :size="80" :src="selectedMember.attributes?.avatarUrl?.default">
              {{ getInitials(selectedMember) }}
            </el-avatar>
            <div class="profile-info">
              <h3>{{ selectedMember.displayName || 'Unknown' }}</h3>
              <p>{{ getPrimaryEmail(selectedMember) }}</p>
              <router-link :to="{ name: 'memberView', params: { id: selectedMember.id } }" class="contact-link">
                <el-button size="small" type="primary" plain>View in Contacts</el-button>
              </router-link>
            </div>
          </div>
          <div class="profile-section">
            <h4>Activity</h4>
            <div class="profile-stats">
              <div class="profile-stat">
                <span class="value">{{ selectedMember.activityCount || 0 }}</span>
                <span class="label">Activities</span>
              </div>
              <div class="profile-stat">
                <span class="value">{{ selectedMember.score || 0 }}</span>
                <span class="label">Score</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script>
import { useProject } from '@/modules/devspace/composables/useProject';
import { MemberService } from '@/modules/member/member-service';
import DevtelService from '@/modules/devspace/services/devtel-api';
import { OrganizationService } from '@/modules/organization/organization-service';
import { mapGetters } from '@/shared/vuex/vuex.helpers';
import { ElMessage } from 'element-plus';

export default {
  name: 'TeamPage',
  setup() {
    const { activeProjectId } = useProject();
    const { currentUser, currentUserEmail, currentTenant } = mapGetters('auth');
    return { activeProjectId, currentUser, currentUserEmail, currentTenant };
  },
  data() {
    return {
      loading: true,
      teamMembers: [],
      totalMembers: 0,
      organizations: [],
      selectedOrganization: null,
      analytics: {
        issuesCompleted: 0,
        avgVelocity: 0,
        avgCycleTime: 0,
      },
      searchQuery: '',
      showProfileDrawer: false,
      selectedMember: null,
      currentPage: 1,
      pageSize: 20,
      showAddMemberDialog: false,
      addingMember: false,
      newContactForm: {
        displayName: '',
        email: '',
      },
    };
  },
  computed: {
    projectId() {
      return this.activeProjectId;
    },
    filteredMembers() {
      let members = this.teamMembers;
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        members = members.filter(m => 
          m.displayName?.toLowerCase().includes(q) || 
          this.getPrimaryEmail(m)?.toLowerCase().includes(q)
        );
      }
      return members.sort((a, b) => {
        const aIsMe = this.isCurrentUser(a);
        const bIsMe = this.isCurrentUser(b);
        if (aIsMe && !bIsMe) return -1;
        if (!aIsMe && bIsMe) return 1;
        return 0;
      });
    },
    workspaceName() {
      const tenant = this.currentTenant?.value || this.currentTenant;
      return tenant?.name || 'Default Workspace';
    },
    contactsPageUrl() {
      return {
        name: 'member',
        query: {
          'order.prop': 'lastActive',
          'order.order': 'descending',
          'settings.teamMember': 'filter',
        },
      };
    },
  },
  mounted() {
    this.fetchTeam();
    this.fetchOrganizations();
  },
  methods: {
    isCurrentUser(member) {
      const userEmail = this.currentUserEmail?.value || this.currentUserEmail;
      if (!userEmail) return false;
      const memberEmails = member.emails || [];
      return memberEmails.some(email => 
        email?.toLowerCase() === userEmail?.toLowerCase()
      );
    },
    async fetchTeam() {
      this.loading = true;
      try {
        const filter = {
          and: [
            { isTeamMember: { eq: true } },
            { isBot: { not: true } },
            { isOrganization: { not: true } },
          ],
        };

        if (this.selectedOrganization) {
          filter.and.push({
            organizations: { contains: [this.selectedOrganization] },
          });
        }

        const body = {
          filter,
          orderBy: 'lastActive_DESC',
          limit: this.pageSize,
          offset: (this.currentPage - 1) * this.pageSize,
        };

        console.log('🔍 fetchTeam - Querying with:', JSON.stringify(body, null, 2));
        const response = await MemberService.listMembers(body);
        console.log('✅ fetchTeam - Response:', { count: response.count, rowsLength: response.rows?.length });
        if (response.rows?.length > 0) {
          console.log('✅ First member:', response.rows[0]);
        }
        
        this.teamMembers = response.rows || [];
        this.totalMembers = response.count || 0;

        if (this.projectId) {
          await this.fetchAnalytics();
        }
      } catch (e) {
        console.error('Failed to fetch team members', e);
        if (ElMessage) {
          ElMessage.error('Failed to load team data');
        }
      } finally {
        this.loading = false;
      }
    },
    async fetchAnalytics() {
      try {
        const analyticsData = await DevtelService.getTeamAnalytics(this.projectId);
        this.analytics = {
          issuesCompleted: analyticsData.totalCompleted || 0,
          avgVelocity: Math.round(analyticsData.totalPoints / 4) || 0,
          avgCycleTime: analyticsData.avgCycleTime || 0,
        };
      } catch (e) {
        console.error('Failed to fetch team analytics', e);
      }
    },
    async fetchOrganizations() {
      try {
        const response = await OrganizationService.listAutocomplete('', 100);
        this.organizations = response || [];
      } catch (e) {
        console.error('Failed to fetch organizations', e);
      }
    },
    handleSearch() {
      if (this.searchQuery.length >= 3) {
        this.currentPage = 1;
        this.fetchTeam();
      }
    },
    handleOrganizationChange() {
      this.currentPage = 1;
      this.fetchTeam();
    },
    handlePageChange(page) {
      this.currentPage = page;
      this.fetchTeam();
    },
    viewProfile(member) {
      this.selectedMember = member;
      this.showProfileDrawer = true;
    },
    getInitials(member) {
      const name = member.displayName || '';
      if (!name) return 'U';
      return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    },
    getPrimaryEmail(member) {
      return member.emails?.[0] || '';
    },
    formatDate(date) {
      if (!date) return '-';
      const d = new Date(date);
      const now = new Date();
      const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
      return d.toLocaleDateString();
    },
    async createNewTeamMember() {
      if (!this.newContactForm.displayName || !this.newContactForm.email) return;
      this.addingMember = true;
      try {
        const createData = {
          data: {
            platform: 'custom',
            username: this.newContactForm.email,
            displayName: this.newContactForm.displayName,
            emails: [this.newContactForm.email],
            joinedAt: new Date().toISOString(),
            manuallyCreated: true,
            organizations: [this.workspaceName],
            attributes: {
              isTeamMember: {
                default: true,
                custom: true,
              },
            },
          },
        };
        console.log('📤 Creating member with workspace org:', this.workspaceName, createData);
        const result = await MemberService.create(createData);
        console.log('📥 Created member:', result);
        if (ElMessage) {
          ElMessage.success('Team member created!');
        }
        this.showAddMemberDialog = false;
        this.newContactForm = { displayName: '', email: '' };
        // Wait for OpenSearch to index the new member
        setTimeout(() => this.fetchTeam(), 2000);
      } catch (e) {
        console.error('Failed to create team member', e);
        if (ElMessage) {
          ElMessage.error(e.response?.data?.message || 'Failed to create team member');
        }
      } finally {
        this.addingMember = false;
      }
    },
  },
};
</script>

<style scoped>
@import '../styles/devspace-common.css';

.team-page { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
.header-left { display: flex; flex-direction: column; gap: 8px; }
.page-header h1 { margin: 0; font-size: 24px; font-weight: 600; }
.datasource-info { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--el-text-color-secondary); }
.datasource-label { color: var(--el-text-color-placeholder); }
.datasource-link { display: flex; align-items: center; gap: 4px; color: var(--el-color-primary); text-decoration: none; }
.datasource-link:hover { text-decoration: underline; }
.header-actions { display: flex; align-items: center; }
.team-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
.stat-card { background: var(--el-bg-color); border: 1px solid var(--el-border-color-light); border-radius: 8px; padding: 20px; text-align: center; }
.stat-card .stat-value { font-size: 32px; font-weight: 700; color: var(--el-color-primary); }
.stat-card .stat-label { font-size: 12px; color: var(--el-text-color-secondary); margin-top: 4px; }
.team-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.member-card { background: var(--el-bg-color); border: 1px solid var(--el-border-color-light); border-radius: 12px; padding: 20px; text-align: center; }
.member-card.is-current-user { border-color: var(--el-color-primary); background: var(--el-color-primary-light-9); }
.me-badge { font-size: 12px; font-weight: 500; color: var(--el-color-primary); margin-left: 4px; }
.member-avatar { margin-bottom: 12px; }
.member-name { margin: 0 0 4px; font-size: 16px; font-weight: 600; }
.member-email { margin: 0 0 4px; font-size: 13px; color: var(--el-text-color-secondary); }
.member-title { margin: 0 0 12px; font-size: 12px; color: var(--el-text-color-placeholder); }
.member-orgs { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin-bottom: 16px; min-height: 24px; }
.more-orgs { font-size: 11px; color: var(--el-text-color-secondary); }
.member-stats { display: flex; justify-content: center; gap: 20px; margin-bottom: 16px; padding: 12px 0; border-top: 1px solid var(--el-border-color-lighter); border-bottom: 1px solid var(--el-border-color-lighter); }
.member-stats .stat { text-align: center; }
.member-stats .stat-num { display: block; font-size: 16px; font-weight: 600; }
.member-stats .stat-label { font-size: 11px; color: var(--el-text-color-secondary); }
.member-actions { margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.profile-content { padding: 0 16px; }
.profile-header { display: flex; flex-direction: column; align-items: center; margin-bottom: 24px; }
.profile-info { text-align: center; margin-top: 12px; }
.profile-info h3 { margin: 0 0 4px; }
.profile-info p { margin: 0 0 8px; color: var(--el-text-color-secondary); }
.contact-link { display: inline-block; }
.profile-section { margin-bottom: 24px; }
.profile-section h4 { margin: 0 0 12px; font-size: 14px; font-weight: 600; }
.profile-stats { display: flex; gap: 20px; }
.profile-stat { text-align: center; }
.profile-stat .value { display: block; font-size: 24px; font-weight: 600; color: var(--el-color-primary); }
.profile-stat .label { font-size: 12px; color: var(--el-text-color-secondary); }
.empty-state, .loading-state { padding: 60px 0; }
.empty-hint { font-size: 13px; color: var(--el-text-color-secondary); margin-top: 8px; }
.empty-options { text-align: left; font-size: 13px; color: var(--el-text-color-secondary); margin: 12px auto; max-width: 400px; padding-left: 20px; }
.empty-options li { margin-bottom: 8px; }
.empty-options a { color: var(--el-color-primary); }
.pagination-wrapper { display: flex; justify-content: center; margin-top: 24px; }
.add-member-content { padding: 0 8px; }
.add-member-description { color: var(--el-text-color-secondary); font-size: 14px; margin-bottom: 16px; }
</style>
