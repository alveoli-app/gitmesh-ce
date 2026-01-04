/**
 * DevSpace Core Module Store
 * Manages workspace and project context for DevSpace (project management)
 */
import DevtelService from '@/modules/devspace/services/devtel-api';

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

    async fetchTeamMembers({ commit }, projectId) {
        if (!projectId) return;
        try {
            const { team } = await DevtelService.listTeamMembers(projectId);
            commit('SET_TEAM_MEMBERS', team);
            return team;
        } catch (error) {
            console.error('Failed to fetch team members', error);
            throw error;
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
