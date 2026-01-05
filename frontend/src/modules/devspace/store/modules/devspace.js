/**
 * DevSpace Core Module Store
 * Manages workspace and project context for DevSpace (project management)
 */
import DevtelService from '@/modules/devspace/services/devtel-api';
import { MemberService } from '@/modules/member/member-service';

const state = () => ({
    workspace: null,
    teamMembers: [],
    projects: [],
    activeProject: null,
    loading: false,
    error: null,
});

const getters = {
    workspace: (state) => state.workspace,
    activeWorkspace: (state) => state.workspace,
    teamMembers: (state) => state.teamMembers,
    projects: (state) => state.projects,
    activeProject: (state) => state.activeProject,
    activeProjectId: (state) => state.activeProject?.id,
    isLoading: (state) => state.loading,
    error: (state) => state.error,
};

const mutations = {
    SET_WORKSPACE(state, workspace) {
        state.workspace = workspace;
    },
    SET_TEAM_MEMBERS(state, teamMembers) {
        state.teamMembers = teamMembers;
    },
    SET_PROJECTS(state, projects) {
        state.projects = projects;
    },
    SET_ACTIVE_PROJECT(state, project) {
        state.activeProject = project;
        // Persist to localStorage
        if (project) {
            localStorage.setItem('devspace_active_project', project.id);
        }
    },
    ADD_PROJECT(state, project) {
        state.projects.push(project);
    },
    UPDATE_PROJECT(state, project) {
        const index = state.projects.findIndex((p) => p.id === project.id);
        if (index !== -1) {
            state.projects.splice(index, 1, project);
        }
        if (state.activeProject?.id === project.id) {
            state.activeProject = project;
        }
    },
    REMOVE_PROJECT(state, projectId) {
        state.projects = state.projects.filter((p) => p.id !== projectId);
        if (state.activeProject?.id === projectId) {
            state.activeProject = null;
        }
    },
    SET_LOADING(state, loading) {
        state.loading = loading;
    },
    SET_ERROR(state, error) {
        state.error = error;
    },
};

const actions = {
    async fetchWorkspace({ commit }) {
        commit('SET_LOADING', true);
        commit('SET_ERROR', null);
        try {
            const workspace = await DevtelService.getWorkspace();
            commit('SET_WORKSPACE', workspace);
            return workspace;
        } catch (error) {
            commit('SET_ERROR', error.message);
            throw error;
        } finally {
            commit('SET_LOADING', false);
        }
    },

    async fetchProjects({ commit, dispatch }) {
        commit('SET_LOADING', true);
        try {
            const { rows } = await DevtelService.listProjects();
            commit('SET_PROJECTS', rows);

            // Restore active project from localStorage
            const savedProjectId = localStorage.getItem('devspace_active_project');
            if (savedProjectId) {
                const savedProject = rows.find((p) => p.id === savedProjectId);
                if (savedProject) {
                    commit('SET_ACTIVE_PROJECT', savedProject);
                } else if (rows.length > 0) {
                    commit('SET_ACTIVE_PROJECT', rows[0]);
                }
            } else if (rows.length > 0) {
                commit('SET_ACTIVE_PROJECT', rows[0]);
            }

            return rows;
        } catch (error) {
            commit('SET_ERROR', error.message);
            throw error;
        } finally {
            commit('SET_LOADING', false);
        }
    },

    async fetchTeamMembers({ commit }) {
        try {
            // Fetch team members from BOTH sources:
            // 1. DevTel users (logged-in users)
            // 2. Contacts with isTeamMember: true
            
            const [devtelResponse, contactsResponse] = await Promise.all([
                DevtelService.listTeamMembers().catch(e => {
                    console.warn('Failed to fetch DevTel team:', e);
                    return { team: [] };
                }),
                MemberService.listMembers({
                    filter: {
                        and: [
                            { isTeamMember: { eq: true } },
                            { isBot: { not: true } },
                            { isOrganization: { not: true } },
                        ],
                    },
                    orderBy: 'displayName_ASC',
                    limit: 100,
                    offset: 0,
                }).catch(e => {
                    console.warn('Failed to fetch contacts team members:', e);
                    return { rows: [] };
                }),
            ]);
            
            console.log('📥 DevTel users:', devtelResponse?.team?.length || 0);
            console.log('📥 Contacts team members:', contactsResponse?.rows?.length || 0);
            
            // Create a map of emails to DevTel users for matching
            const usersByEmail = new Map();
            (devtelResponse?.team || []).forEach(user => {
                if (user.email) {
                    usersByEmail.set(user.email.toLowerCase(), user);
                }
            });
            
            // Process contacts - check if they have a matching user account
            const teamMembers = (contactsResponse?.rows || []).map(member => {
                const memberEmail = member.emails?.[0]?.toLowerCase();
                const matchingUser = memberEmail ? usersByEmail.get(memberEmail) : null;
                
                return {
                    id: matchingUser ? matchingUser.id : member.id,
                    memberId: member.id,
                    userId: matchingUser?.id || null,
                    name: member.displayName || member.fullName || member.emails?.[0] || 'Unknown',
                    email: member.emails?.[0] || '',
                    avatarUrl: member.attributes?.avatarUrl?.default || matchingUser?.avatarUrl || null,
                    hasJoined: !!matchingUser, // Has logged in
                    isUser: !!matchingUser,
                };
            });
            
            // Add any DevTel users that don't have a matching contact
            const contactEmails = new Set(teamMembers.map(m => m.email?.toLowerCase()).filter(Boolean));
            (devtelResponse?.team || []).forEach(user => {
                if (!user.email || !contactEmails.has(user.email.toLowerCase())) {
                    teamMembers.push({
                        id: user.id,
                        memberId: null,
                        userId: user.id,
                        name: user.fullName || user.firstName || user.email || 'Unknown',
                        email: user.email || '',
                        avatarUrl: user.avatarUrl || null,
                        hasJoined: true,
                        isUser: true,
                    });
                }
            });
            
            console.log('👥 Combined team members:', teamMembers.length, teamMembers);
            
            commit('SET_TEAM_MEMBERS', teamMembers);
            return teamMembers;
        } catch (error) {
            console.error('Failed to fetch team members', error);
            commit('SET_TEAM_MEMBERS', []);
            return [];
        }
    },

    async createProject({ commit }, data) {
        const project = await DevtelService.createProject(data);
        commit('ADD_PROJECT', project);
        return project;
    },

    async updateProject({ commit }, { id, data }) {
        const project = await DevtelService.updateProject(id, data);
        commit('UPDATE_PROJECT', project);
        return project;
    },

    async deleteProject({ commit }, id) {
        await DevtelService.deleteProject(id);
        commit('REMOVE_PROJECT', id);
    },

    setActiveProject({ commit, state }, project) {
        commit('SET_ACTIVE_PROJECT', project);
    },

    setActiveProjectId({ commit, state }, projectId) {
        const project = state.projects.find((p) => p.id === projectId);
        if (project) {
            commit('SET_ACTIVE_PROJECT', project);
        }
    },

    async initialize({ dispatch }) {
        await dispatch('fetchWorkspace');
        await dispatch('fetchProjects');
    },
};

export default {
    namespaced: true,
    state,
    getters,
    mutations,
    actions,
};
