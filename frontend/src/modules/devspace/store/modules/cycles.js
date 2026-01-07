/**
 * Cycles Store Module
 * Manages sprint/cycle state
 */
import DevtelService from '@/modules/devspace/services/devtel-api';

const state = () => ({
    cycles: [],
    activeCycle: null,
    selectedCycle: null,
    burndownData: null,
    loading: false,
});

const getters = {
    cycles: (state) => state.cycles,
    activeCycle: (state) => state.activeCycle,
    selectedCycle: (state) => state.selectedCycle,
    burndownData: (state) => state.burndownData,
    isLoading: (state) => state.loading,

    // Filtered getters
    plannedCycles: (state) => state.cycles.filter((c) => c.status === 'planned'),
    completedCycles: (state) => state.cycles.filter((c) => c.status === 'completed'),
};

const mutations = {
    SET_CYCLES(state, cycles) {
        state.cycles = cycles;
        state.activeCycle = cycles.find((c) => c.status === 'active') || null;
    },

    ADD_CYCLE(state, cycle) {
        state.cycles.push(cycle);
    },

    UPDATE_CYCLE(state, cycle) {
        const index = state.cycles.findIndex((c) => c.id === cycle.id);
        if (index !== -1) {
            state.cycles.splice(index, 1, cycle);
        }

        if (cycle.status === 'active') {
            // Deactivate other cycles
            state.cycles.forEach((c) => {
                if (c.id !== cycle.id && c.status === 'active') {
                    c.status = 'planned';
                }
            });
            state.activeCycle = cycle;
        } else if (state.activeCycle?.id === cycle.id) {
            state.activeCycle = state.cycles.find((c) => c.status === 'active') || null;
        }

        if (state.selectedCycle?.id === cycle.id) {
            state.selectedCycle = cycle;
        }
    },

    REMOVE_CYCLE(state, cycleId) {
        state.cycles = state.cycles.filter((c) => c.id !== cycleId);
        if (state.activeCycle?.id === cycleId) {
            state.activeCycle = null;
        }
        if (state.selectedCycle?.id === cycleId) {
            state.selectedCycle = null;
        }
    },

    SET_SELECTED_CYCLE(state, cycle) {
        state.selectedCycle = cycle;
    },

    SET_BURNDOWN_DATA(state, data) {
        state.burndownData = data;
    },

    SET_LOADING(state, loading) {
        state.loading = loading;
    },

    RESET_STATE(state) {
        state.cycles = [];
        state.activeCycle = null;
        state.selectedCycle = null;
        state.burndownData = null;
    },
};

const actions = {
    resetState({ commit }) {
        commit('RESET_STATE');
    },

    async fetchCycles({ commit, rootState }, projectId) {
        if (!projectId) {
            projectId = rootState.devspace?.activeProject?.id;
        }
        if (!projectId) {
            console.warn('[Cycles] No project ID provided and no active project');
            return;
        }

        const requestedProjectId = projectId;

        commit('SET_LOADING', true);
        try {
            const { rows } = await DevtelService.listCycles(projectId);
            
            // Race condition check
            const currentActiveId = rootState.devspace?.activeProject?.id;
            if (currentActiveId && currentActiveId !== requestedProjectId) {
                return;
            }

            commit('SET_CYCLES', rows);
            return rows;
        } catch (error) {
            console.error('[Cycles] Failed to fetch cycles:', error);
            throw error;
        } finally {
            const currentActiveId = rootState.devspace?.activeProject?.id;
            if (!currentActiveId || currentActiveId === requestedProjectId) {
                commit('SET_LOADING', false);
            }
        }
    },

    async createCycle({ commit, rootState }, data) {
        const projectId = rootState.devspace?.activeProject?.id;
        if (!projectId) throw new Error('No active project');

        const cycle = await DevtelService.createCycle(projectId, data);
        commit('ADD_CYCLE', cycle);
        return cycle;
    },

    async updateCycle({ commit, rootState }, { cycleId, data }) {
        const projectId = rootState.devspace?.activeProject?.id;
        if (!projectId) throw new Error('No active project');

        const cycle = await DevtelService.updateCycle(projectId, cycleId, data);
        commit('UPDATE_CYCLE', cycle);
        return cycle;
    },

    async deleteCycle({ commit, rootState }, cycleId) {
        console.log('[Cycles Store] deleteCycle action called with cycleId:', cycleId);
        const projectId = rootState.devspace.activeProject?.id;
        if (!projectId) {
            console.error('[Cycles Store] No active project');
            throw new Error('No active project');
        }

        console.log('[Cycles Store] Calling DevtelService.deleteCycle with projectId:', projectId, 'cycleId:', cycleId);
        const result = await DevtelService.deleteCycle(projectId, cycleId);
        console.log('[Cycles Store] DevtelService.deleteCycle returned:', result);
        commit('REMOVE_CYCLE', cycleId);
        console.log('[Cycles Store] REMOVE_CYCLE committed');
        return result;
    },

    async selectCycle({ commit, rootState }, cycleId) {
        const projectId = rootState.devspace.activeProject?.id;
        if (!projectId) return;

        const cycle = await DevtelService.getCycle(projectId, cycleId);
        commit('SET_SELECTED_CYCLE', cycle);
        return cycle;
    },

    async fetchBurndown({ commit, rootState }, cycleId) {
        const projectId = rootState.devspace.activeProject?.id;
        if (!projectId) return;

        const data = await DevtelService.getCycleBurndown(projectId, cycleId);
        commit('SET_BURNDOWN_DATA', data);
        return data;
    },

    async planSprint({ dispatch, rootState }, { cycleId, issueIds }) {
        const projectId = rootState.devspace.activeProject?.id;
        if (!projectId) throw new Error('No active project');

        await DevtelService.planSprint(projectId, cycleId, issueIds);

        // Refresh cycles and issues
        await dispatch('fetchCycles', projectId);
        await dispatch('issues/fetchIssues', projectId, { root: true });
    },

    async startCycle({ commit, rootState }, cycleId) {
        const projectId = rootState.devspace.activeProject?.id;
        if (!projectId) throw new Error('No active project');

        const cycle = await DevtelService.startCycle(projectId, cycleId);
        commit('UPDATE_CYCLE', cycle);
        return cycle;
    },

    async completeCycle({ commit, dispatch, rootState }, cycleId) {
        const projectId = rootState.devspace.activeProject?.id;
        if (!projectId) throw new Error('No active project');

        const cycle = await DevtelService.completeCycle(projectId, cycleId);
        commit('UPDATE_CYCLE', cycle);

        // Refresh burndown data
        if (cycle.id) {
            await dispatch('fetchBurndown', cycle.id);
        }
        return cycle;
    },
};

export default {
    namespaced: true,
    state,
    getters,
    mutations,
    actions,
};
