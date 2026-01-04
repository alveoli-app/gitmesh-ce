<template>
  <div class="team-page devspace-page">
    <div class="page-header">
      <h1>Team</h1>
      <div class="header-actions">
        <el-input
          v-model="searchQuery"
          placeholder="Search members..."
          prefix-icon="Search"
          clearable
          style="width: 200px"
          @input="handleSearch"
        />
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <el-skeleton :rows="5" animated />
    </div>

    <template v-else>
      <!-- Team Stats -->
      <div class="team-stats">
        <div class="stat-card">
          <div class="stat-value">{{ teamMembers.length }}</div>
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

      <!-- Team Grid -->
      <div class="team-grid">
        <div v-for="member in filteredMembers" :key="member.id" class="member-card">
          <div class="member-avatar">
            <el-avatar :size="64">{{ (member.fullName || member.name || 'U').charAt(0) }}</el-avatar>
          </div>
          <div class="member-info">
            <h3 class="member-name">{{ member.fullName || member.name || 'Unknown' }}</h3>
            <p class="member-email">{{ member.email }}</p>
          </div>
          
          <div class="member-skills">
            <el-tag 
              v-for="skill in member.skills?.slice(0, 3)" 
              :key="skill.id"
              size="small"
              type="info"
            >
              {{ skill.skill }}
            </el-tag>
            <span v-if="member.skills?.length > 3" class="more-skills">
              +{{ member.skills.length - 3 }}
            </span>
          </div>

          <div class="member-stats">
            <div class="stat">
              <span class="stat-num">{{ member.issueStats?.completed || 0 }}</span>
              <span class="stat-label">Done</span>
            </div>
            <div class="stat">
              <span class="stat-num">{{ member.issueStats?.inProgress || 0 }}</span>
              <span class="stat-label">Active</span>
            </div>
            <div class="stat">
              <span class="stat-num">{{ member.issueStats?.total || 0 }}</span>
              <span class="stat-label">Total</span>
            </div>
          </div>

          <div class="member-actions">
            <el-button size="small" @click="viewProfile(member)">View Profile</el-button>
            <router-link :to="{ name: 'member', params: { id: member.id } }">
              <el-button size="small" type="primary" plain>View in Contacts</el-button>
            </router-link>
          </div>
        </div>
      </div>

      <div v-if="filteredMembers.length === 0" class="empty-state">
        <el-empty description="No team members found" />
      </div>
    </template>

    <!-- Profile Drawer -->
    <el-drawer v-model="showProfileDrawer" :title="selectedMember?.name" size="400px">
      <template v-if="selectedMember">
        <div class="profile-content">
          <div class="profile-header">
            <el-avatar :size="80">{{ (selectedMember.fullName || selectedMember.name)?.charAt(0) }}</el-avatar>
            <div class="profile-info">
              <h3>{{ selectedMember.fullName || selectedMember.name }}</h3>
              <p>{{ selectedMember.email }}</p>
              <router-link :to="{ name: 'member', params: { id: selectedMember.id } }" class="contact-link">
                <el-button size="small" type="primary" plain>View in Contacts</el-button>
              </router-link>
            </div>
          </div>

          <div class="profile-section">
            <h4>Skills</h4>
            <div class="skills-list">
              <el-tag 
                v-for="skill in selectedMember.skills" 
                :key="skill.id"
                size="default"
                :type="getLevelType(skill.level)"
                closable
                @close="removeSkill(skill)"
              >
                {{ skill.skill }} ({{ skill.level }})
              </el-tag>
              <el-input 
                  v-if="addingSkill" 
                  v-model="newSkillName" 
                  class="new-skill-input" 
                  size="small" 
                  placeholder="New Skill" 
                  @keyup.enter="addSkill"
                  @blur="addingSkill = false"
                  ref="skillInput"
              />
              <el-button v-else size="small" class="button-new-tag" @click="startAddSkill">+ New Skill</el-button>
            </div>
          </div>

          <div class="profile-section">
            <h4>Statistics</h4>
            <div class="profile-stats">
              <div class="profile-stat">
                <span class="value">{{ selectedMember.issueStats?.completed || 0 }}</span>
                <span class="label">Completed</span>
              </div>
              <div class="profile-stat">
                <span class="value">{{ selectedMember.issueStats?.inProgress || 0 }}</span>
                <span class="label">In Progress</span>
              </div>
              <div class="profile-stat">
                <span class="value">{{ selectedMember.issueStats?.avgPoints || 0 }}</span>
                <span class="label">Avg Points</span>
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
import DevtelService from '@/modules/devspace/services/devtel-api';

export default {
  name: 'TeamPage',
  setup() {
    const { activeProjectId } = useProject();
    return { activeProjectId };
  },
  data() {
    return {
      loading: true,
      teamMembers: [],
      analytics: {
          completionsByUser: [], // Initialize
      },
      searchQuery: '',
      showProfileDrawer: false,
      selectedMember: null,
      addingSkill: false,
      newSkillName: '',
    };
  },
  computed: {
    projectId() {
      return this.activeProjectId;
    },
    filteredMembers() {
      if (!this.searchQuery) return this.teamMembers;
      const q = this.searchQuery.toLowerCase();
      return this.teamMembers.filter(m => 
        m.fullName?.toLowerCase().includes(q) || 
        m.name?.toLowerCase().includes(q) || 
        m.email?.toLowerCase().includes(q)
      );
    },
    sortedContributors() {
        if (!this.analytics.completionsByUser) return [];
        return [...this.analytics.completionsByUser].sort((a, b) => b.storyPoints - a.storyPoints).slice(0, 5);
    },
    maxPoints() {
        if (this.sortedContributors.length === 0) return 0;
        return Math.max(...this.sortedContributors.map(c => c.storyPoints));
    },
  },
  mounted() {
    if (this.projectId) {
      this.fetchTeam();
    }
  },
  methods: {
    async fetchTeam() {
      if (!this.projectId) return;
      this.loading = true;
      try {
        const [membersData, analyticsData] = await Promise.all([
          DevtelService.listTeamMembers(this.projectId),
          DevtelService.getTeamAnalytics(this.projectId),
        ]);
        
        // Backend returns { team: [...] }
        this.teamMembers = membersData.team || [];
        
        // Transform analytics data
        this.analytics = {
          issuesCompleted: analyticsData.totalCompleted || 0,
          avgVelocity: Math.round(analyticsData.totalPoints / 4) || 0, // Avg per week
          avgCycleTime: 5, // TODO: Calculate from actual data when available
          completionsByUser: analyticsData.completionsByUser || [],
        };
      } catch (e) {
        console.error('Failed to fetch team', e);
        this.$message.error('Failed to load team data');
      } finally {
        this.loading = false;
      }
    },
    handleSearch() {
      // Local filter, no API call needed
    },
    viewProfile(member) {
      this.selectedMember = member;
      this.showProfileDrawer = true;
    },
    getLevelType(level) {
      const types = { beginner: 'info', intermediate: '', advanced: 'success', expert: 'warning' };
      return types[level] || '';
    },
    startAddSkill() {
        this.addingSkill = true;
        this.$nextTick(() => {
            if (this.$refs.skillInput) this.$refs.skillInput.focus();
        });
    },
    async addSkill() {
        if (!this.newSkillName.trim() || !this.selectedMember) return;
        try {
            const skill = await DevtelService.addMemberSkill(this.projectId, this.selectedMember.id, {
                skill: this.newSkillName,
                level: 'intermediate' // Default
            });
            if (!this.selectedMember.skills) this.selectedMember.skills = [];
            this.selectedMember.skills.push(skill);
            this.newSkillName = '';
            this.addingSkill = false;
        } catch (e) {
            this.$message.error('Failed to add skill');
        }
    },
    async removeSkill(skill) {
        if (!this.selectedMember) return;
        try {
            await DevtelService.removeMemberSkill(this.projectId, this.selectedMember.id, skill.id);
            this.selectedMember.skills = this.selectedMember.skills.filter(s => s.id !== skill.id);
        } catch (e) {
            this.$message.error('Failed to remove skill');
        }
    },
  },
};
</script>

<style scoped>
@import '../styles/devspace-common.css';

.team-page {
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
.team-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}
.stat-card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 20px;
  text-align: center;
}
.stat-card .stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--el-color-primary);
}
.stat-card .stat-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}
.team-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}
.member-card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
}
.member-avatar {
  margin-bottom: 12px;
}
.member-name {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
}
.member-email {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.member-skills {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin-bottom: 16px;
  min-height: 24px;
}
.more-skills {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}
.member-stats {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 16px;
  padding: 12px 0;
  border-top: 1px solid var(--el-border-color-lighter);
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.member-stats .stat {
  text-align: center;
}
.member-stats .stat-num {
  display: block;
  font-size: 18px;
  font-weight: 600;
}
.member-stats .stat-label {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}
.member-actions {
  margin-top: 8px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}
.profile-content {
  padding: 0 16px;
}
.profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;
}
.profile-info {
  text-align: center;
  margin-top: 12px;
}
.profile-info h3 {
  margin: 0 0 4px;
}
.profile-info p {
  margin: 0 0 8px;
  color: var(--el-text-color-secondary);
}
.contact-link {
  display: inline-block;
}
.profile-section {
  margin-bottom: 24px;
}
.profile-section h4 {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
}
.skills-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.profile-stats {
  display: flex;
  gap: 20px;
}
.profile-stat {
  text-align: center;
}
.profile-stat .value {
  display: block;
  font-size: 24px;
  font-weight: 600;
  color: var(--el-color-primary);
}
.profile-stat .label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.empty-state, .loading-state {
  padding: 60px 0;
}
.team-analytics-section {
    margin-bottom: 32px;
}
.team-analytics-section h3 {
    margin: 0 0 16px;
    font-size: 18px;
}
.contributors-chart {
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-light);
    border-radius: 8px;
    padding: 20px;
}
.contributor-bar-row {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
}
.contributor-bar-row:last-child {
    margin-bottom: 0;
}
.user-info {
    display: flex;
    align-items: center;
    width: 200px;
    gap: 8px;
}
.user-info .name {
    font-size: 14px;
    font-weight: 500;
}
.bar-container {
    flex: 1;
    background: var(--el-fill-color-light);
    height: 8px;
    border-radius: 4px;
    margin: 0 16px;
    overflow: hidden;
}
.bar {
    height: 100%;
    background: var(--el-color-primary);
    border-radius: 4px;
}
.stats {
    display: flex;
    gap: 16px;
    font-size: 13px;
    color: var(--el-text-color-secondary);
    min-width: 150px;
    justify-content: flex-end;
}
/* Existing styles */
.new-skill-input {
    width: 100px;
    margin-left: 8px;
    vertical-align: bottom;
}
.button-new-tag {
    margin-left: 8px;
    height: 32px;
    line-height: 30px;
    padding-top: 0;
    padding-bottom: 0;
}
</style>
