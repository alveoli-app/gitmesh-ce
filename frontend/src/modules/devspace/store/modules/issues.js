/**
 * Issues Store Module
 * Manages issue state for Kanban board and backlog
 * Includes Socket.IO for real-time updates
 */
import DevtelService from '@/modules/devspace/services/devtel-api';
import { devtelSocket } from '@/modules/devspace/services/devtel-socket';

const state = () => ({
    issues: [],
    issuesByStatus: {
        backlog: [],
        todo: [],
        in_progress: [],
        review: [],
        done: [],
    },
    selectedIssue: null,
    filters: {
        status: [],
        priority: [],
        assigneeIds: [],
        cycleId: null,
        search: '',
    },
    loading: false,
    total: 0,
    socketConnected: false,
});

const getters = {
    issues: (state) => state.issues,
    issuesByStatus: (state) => state.issuesByStatus,
    selectedIssue: (state) => state.selectedIssue,
    filters: (state) => state.filters,
    isLoading: (state) => state.loading,
    total: (state) => state.total,

    // Board-specific getters
    backlogIssues: (state) => state.issuesByStatus.backlog,
    todoIssues: (state) => state.issuesByStatus.todo,
    inProgressIssues: (state) => state.issuesByStatus.in_progress,
    reviewIssues: (state) => state.issuesByStatus.review,
    doneIssues: (state) => state.issuesByStatus.done,
};

const mutations = {
    SET_ISSUES(state, { issues, total }) {
        state.issues = issues;
        state.total = total;

        // Group by status for board view
        state.issuesByStatus = {
            backlog: [],
            todo: [],
            in_progress: [],
            review: [],
            done: [],
        };

        issues.forEach((issue) => {
            if (state.issuesByStatus[issue.status]) {
                state.issuesByStatus[issue.status].push(issue);
            }
        });
    },

    ADD_ISSUE(state, issue) {
        // Avoid duplicates from Socket.IO
        if (state.issues.find(i => i.id === issue.id)) return;

        state.issues.push(issue);
        if (state.issuesByStatus[issue.status]) {
            state.issuesByStatus[issue.status].push(issue);
        }
        state.total++;
    },

    UPDATE_ISSUE(state, issue) {
        // Update in flat list
        const index = state.issues.findIndex((i) => i.id === issue.id);
        if (index !== -1) {
            const oldStatus = state.issues[index].status;
            state.issues.splice(index, 1, issue);

            // Update in status groups
            if (oldStatus !== issue.status) {
                // Remove from old status
                const oldIndex = state.issuesByStatus[oldStatus]?.findIndex((i) => i.id === issue.id);
                if (oldIndex !== undefined && oldIndex !== -1) {
                    state.issuesByStatus[oldStatus].splice(oldIndex, 1);
                }
                // Add to new status
                if (state.issuesByStatus[issue.status]) {
                    state.issuesByStatus[issue.status].push(issue);
                }
            } else {
                // Just update in place
                const statusIndex = state.issuesByStatus[issue.status]?.findIndex((i) => i.id === issue.id);
                if (statusIndex !== undefined && statusIndex !== -1) {
                    state.issuesByStatus[issue.status].splice(statusIndex, 1, issue);
                }
            }
        }

        // Update selected issue if it's the same
        if (state.selectedIssue?.id === issue.id) {
            state.selectedIssue = issue;
        }
    },

    REMOVE_ISSUE(state, issueId) {
        const issue = state.issues.find((i) => i.id === issueId);
        if (issue) {
            state.issues = state.issues.filter((i) => i.id !== issueId);
            state.issuesByStatus[issue.status] = state.issuesByStatus[issue.status]?.filter(
                (i) => i.id !== issueId
            ) || [];
            state.total--;
        }
        if (state.selectedIssue?.id === issueId) {
            state.selectedIssue = null;
        }
    },

    SET_SELECTED_ISSUE(state, issue) {
        state.selectedIssue = issue;
    },

    SET_FILTERS(state, filters) {
        state.filters = { ...state.filters, ...filters };
    },

    RESET_FILTERS(state) {
        state.filters = {
            status: [],
            priority: [],
            assigneeIds: [],
            cycleId: null,
            search: '',
        };
    },

    SET_LOADING(state, loading) {
        state.loading = loading;
    },

    SET_SOCKET_CONNECTED(state, connected) {
        state.socketConnected = connected;
    },

    RESET_STATE(state) {
        state.issues = [];
        state.issuesByStatus = {
            backlog: [],
            todo: [],
            in_progress: [],
            review: [],
            done: [],
        };
        state.selectedIssue = null;
        state.filters = {
            status: [],
            priority: [],
            assigneeIds: [],
            cycleId: null,
            search: '',
        };
        state.total = 0;
    },

    UPDATE_COLUMN_ISSUES(state, { status, issues }) {
        if (state.issuesByStatus[status]) {
            state.issuesByStatus[status] = issues;
            // Ensure all issues in this column have the correct status
            issues.forEach(issue => {
                if (issue.status !== status) {
                    issue.status = status;
                }
            });
        }
    },

    // Optimistic update for drag-drop
    MOVE_ISSUE_STATUS(state, { issueId, newStatus, targetIndex }) {
        const issue = state.issues.find((i) => i.id === issueId);
        if (!issue) return;

        const oldStatus = issue.status;

        // Remove from old status
        const oldStatusIndex = state.issuesByStatus[oldStatus]?.findIndex((i) => i.id === issueId);
        if (oldStatusIndex !== undefined && oldStatusIndex !== -1) {
            state.issuesByStatus[oldStatus].splice(oldStatusIndex, 1);
        }

        // Update issue status
        issue.status = newStatus;

        // Add to new status at target position
        if (state.issuesByStatus[newStatus]) {
            if (targetIndex !== undefined) {
                state.issuesByStatus[newStatus].splice(targetIndex, 0, issue);
            } else {
                state.issuesByStatus[newStatus].push(issue);
            }
        }
    },
};

const actions = {
    // Initialize Socket.IO connection and event handlers
    initializeSocket({ commit, rootState }) {
        const projectId = rootState.devspace.activeProject?.id;

        devtelSocket.connect();

        // Register event handlers
        devtelSocket.on('issue:created', (issue) => {
            commit('ADD_ISSUE', issue);
        });

        devtelSocket.on('issue:updated', (issue) => {
            commit('UPDATE_ISSUE', issue);
        });

        devtelSocket.on('issue:deleted', ({ id }) => {
            commit('REMOVE_ISSUE', id);
        });

        devtelSocket.on('issue:status-changed', ({ issue }) => {
            commit('UPDATE_ISSUE', issue);
        });

        if (projectId) {
            devtelSocket.joinProject(projectId);
        }

        commit('SET_SOCKET_CONNECTED', true);
    },

    // Disconnect Socket.IO
    disconnectSocket({ commit }) {
        devtelSocket.disconnect();
        commit('SET_SOCKET_CONNECTED', false);
    },

    // Update Socket.IO room when project changes
    updateSocketRoom({ commit, rootState }, projectId) {
        if (projectId) {
            devtelSocket.joinProject(projectId);
        }
    },

    RESET_STATE(state) {
        state.issues = [];
        state.issuesByStatus = {
            backlog: [],
            todo: [],
            in_progress: [],
            review: [],
            done: [],
        };
        state.selectedIssue = null;
        state.filters = {
            status: [],
            priority: [],
            assigneeIds: [],
            cycleId: null,
            search: '',
        };
        state.total = 0;
    },

    resetState({ commit }) {
        commit('RESET_STATE');
    },

    async fetchIssues({ commit, state, rootState }, projectId) {
        if (!projectId) {
            projectId = rootState.devspace?.activeProject?.id;
        }
        if (!projectId) {
            console.warn('[Issues] No project ID provided and no active project');
            return;
        }

        const requestedProjectId = projectId;

        commit('SET_LOADING', true);
        try {
            const { rows, count } = await DevtelService.listIssues(projectId, state.filters);

            // Race condition check: ensure we are still on the requested project
            const currentActiveId = rootState.devspace?.activeProject?.id;
            if (currentActiveId && currentActiveId !== requestedProjectId) {
                console.warn(`[Issues] Ignoring fetch result for project ${requestedProjectId} as active project is now ${currentActiveId}`);
                return;
            }

            commit('SET_ISSUES', { issues: rows, total: count });
            return rows;
        } catch (error) {
            console.error('[Issues] Failed to fetch issues:', error);
            throw error;
        } finally {
            // Only turn off loading if we are still on the same project
            const currentActiveId = rootState.devspace?.activeProject?.id;
            if (!currentActiveId || currentActiveId === requestedProjectId) {
                commit('SET_LOADING', false);
            }
        }
    },

    async createIssue({ commit, rootState }, payload) {
        const projectId = payload.projectId || rootState.devspace?.activeProject?.id;
        if (!projectId) throw new Error('No active project');

        const issueData = payload.data || payload;
        const issue = await DevtelService.createIssue(projectId, issueData);

        // Check if still on same project
        const currentActiveId = rootState.devspace?.activeProject?.id;
        if (currentActiveId && currentActiveId !== projectId) {
            return issue;
        }

        commit('ADD_ISSUE', issue);
        return issue;
    },

    async updateIssue({ commit, rootState }, { issueId, data, projectId }) {
        const targetProjectId = projectId || rootState.devspace.activeProject?.id;
        if (!targetProjectId) throw new Error('No active project');

        const issue = await DevtelService.updateIssue(targetProjectId, issueId, data);

        const currentActiveId = rootState.devspace?.activeProject?.id;
        if (currentActiveId && currentActiveId !== targetProjectId) {
            return issue;
        }

        commit('UPDATE_ISSUE', issue);
        return issue;
    },

    async deleteIssue({ commit, rootState }, issueId) {
        const projectId = rootState.devspace.activeProject?.id;
        if (!projectId) throw new Error('No active project');

        await DevtelService.deleteIssue(projectId, issueId);

        const currentActiveId = rootState.devspace?.activeProject?.id;
        if (currentActiveId && currentActiveId !== projectId) {
            return;
        }

        commit('REMOVE_ISSUE', issueId);
    },

    async bulkUpdateIssues({ commit, dispatch, rootState }, { issueIds, data, projectId }) {
        const targetProjectId = projectId || rootState.devspace.activeProject?.id;
        if (!targetProjectId) throw new Error('No active project');

        await DevtelService.bulkUpdateIssues(targetProjectId, issueIds, data);
        // Refresh all issues after bulk update
        await dispatch('fetchIssues', projectId);
    },

    async selectIssue({ commit, rootState }, issueId) {
        const projectId = rootState.devspace.activeProject?.id;
        if (!projectId) return;

        const issue = await DevtelService.getIssue(projectId, issueId);

        const currentActiveId = rootState.devspace?.activeProject?.id;
        if (currentActiveId && currentActiveId !== projectId) {
            return;
        }

        commit('SET_SELECTED_ISSUE', issue);
        return issue;
    },

    clearSelectedIssue({ commit }) {
        commit('SET_SELECTED_ISSUE', null);
    },

    setFilters({ commit, dispatch }, filters) {
        commit('SET_FILTERS', filters);
        return dispatch('fetchIssues');
    },

    resetFilters({ commit, dispatch }) {
        commit('RESET_FILTERS');
        return dispatch('fetchIssues');
    },

    // Optimistic drag-drop update
    async moveIssue({ commit, dispatch, rootState }, { issueId, newStatus, targetIndex }) {
        const projectId = rootState.devspace.activeProject?.id;
        if (!projectId) return;

        // Optimistic update
        commit('MOVE_ISSUE_STATUS', { issueId, newStatus, targetIndex });

        try {
            // Actual API call
            await DevtelService.updateIssue(projectId, issueId, { status: newStatus });
        } catch (error) {
            // Rollback on error - refetch issues
            await dispatch('fetchIssues', projectId);
            throw error;
        }
    },
};

export default {
    namespaced: true,
    state,
    getters,
    mutations,
    actions,
};

