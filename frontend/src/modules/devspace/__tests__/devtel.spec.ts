/**
 * DevTel Frontend Component Tests
 * Using Vue Test Utils
 */
import { mount, shallowMount } from '@vue/test-utils'
import { createStore } from 'vuex'
import BurndownChart from '@/modules/devspace/components/BurndownChart.vue'
import VelocityChart from '@/modules/devspace/components/VelocityChart.vue'

describe('BurndownChart', () => {
    const mockData = [
        { date: '2025-01-01', remaining: 40 },
        { date: '2025-01-02', remaining: 38 },
        { date: '2025-01-03', remaining: 35 },
        { date: '2025-01-04', remaining: 32 },
        { date: '2025-01-05', remaining: 28 },
        { date: '2025-01-06', remaining: 24 },
        { date: '2025-01-07', remaining: 20 },
    ]

    it('Should render SVG chart', () => {
        const wrapper = shallowMount(BurndownChart, {
            props: {
                data: mockData,
                totalPoints: 40,
            },
        })

        expect(wrapper.find('.burndown-chart').exists()).toBe(true)
        expect(wrapper.find('svg').exists()).toBe(true)
    })

    it('Should render title when provided', () => {
        const wrapper = shallowMount(BurndownChart, {
            props: {
                title: 'Sprint 1 Burndown',
                data: mockData,
                totalPoints: 40,
            },
        })

        expect(wrapper.find('.chart-header h3').text()).toBe('Sprint 1 Burndown')
    })

    it('Should render ideal and actual lines', () => {
        const wrapper = shallowMount(BurndownChart, {
            props: {
                data: mockData,
                totalPoints: 40,
            },
        })

        expect(wrapper.find('.ideal-line').exists()).toBe(true)
        expect(wrapper.find('.actual-line').exists()).toBe(true)
    })

    it('Should render data points for each day', () => {
        const wrapper = shallowMount(BurndownChart, {
            props: {
                data: mockData,
                totalPoints: 40,
            },
        })

        const points = wrapper.findAll('.data-points circle')
        expect(points.length).toBe(mockData.length)
    })

    it('Should handle empty data gracefully', () => {
        const wrapper = shallowMount(BurndownChart, {
            props: {
                data: [],
                totalPoints: 0,
            },
        })

        expect(wrapper.find('.burndown-chart').exists()).toBe(true)
    })
})

describe('VelocityChart', () => {
    const mockData = [
        { name: 'Sprint 1', committed: 40, completed: 35 },
        { name: 'Sprint 2', committed: 42, completed: 40 },
        { name: 'Sprint 3', committed: 38, completed: 38 },
        { name: 'Sprint 4', committed: 45, completed: 42 },
    ]

    it('Should render SVG chart', () => {
        const wrapper = shallowMount(VelocityChart, {
            props: {
                data: mockData,
            },
        })

        expect(wrapper.find('.velocity-chart').exists()).toBe(true)
        expect(wrapper.find('svg').exists()).toBe(true)
    })

    it('Should display average velocity', () => {
        const wrapper = shallowMount(VelocityChart, {
            props: {
                data: mockData,
            },
        })

        const avgVelocity = wrapper.find('.velocity-avg')
        expect(avgVelocity.exists()).toBe(true)
        // Average of 35, 40, 38, 42 = 38.75
        expect(avgVelocity.text()).toContain('39') // Rounded
    })

    it('Should render bars for each sprint', () => {
        const wrapper = shallowMount(VelocityChart, {
            props: {
                data: mockData,
            },
        })

        const completedBars = wrapper.findAll('.bar.completed')
        expect(completedBars.length).toBe(mockData.length)
    })

    it('Should render legend', () => {
        const wrapper = shallowMount(VelocityChart, {
            props: {
                data: mockData,
            },
        })

        expect(wrapper.find('.legend-item.committed').exists()).toBe(true)
        expect(wrapper.find('.legend-item.completed').exists()).toBe(true)
    })

    it('Should handle empty data gracefully', () => {
        const wrapper = shallowMount(VelocityChart, {
            props: {
                data: [],
            },
        })

        expect(wrapper.find('.velocity-chart').exists()).toBe(true)
        expect(wrapper.find('.velocity-avg').text()).toContain('0')
    })
})

describe('DevTel Store - Issues Module', () => {
    const createMockStore = () => {
        return createStore({
            modules: {
                devtel: {
                    namespaced: true,
                    modules: {
                        issues: {
                            namespaced: true,
                            state: () => ({
                                issues: [],
                                loading: false,
                                filters: {},
                            }),
                            getters: {
                                issuesByStatus: (state) => (status) =>
                                    state.issues.filter(i => i.status === status),
                                backlogIssues: (state) =>
                                    state.issues.filter(i => i.status === 'backlog'),
                            },
                            mutations: {
                                SET_ISSUES: (state, issues) => { state.issues = issues },
                                ADD_ISSUE: (state, issue) => { state.issues.push(issue) },
                                UPDATE_ISSUE: (state, updated) => {
                                    const idx = state.issues.findIndex(i => i.id === updated.id)
                                    if (idx !== -1) state.issues[idx] = updated
                                },
                                REMOVE_ISSUE: (state, id) => {
                                    state.issues = state.issues.filter(i => i.id !== id)
                                },
                            },
                        },
                    },
                },
            },
        })
    }

    it('Should add an issue to the store', () => {
        const store = createMockStore()
        const issue = { id: '1', title: 'Test Issue', status: 'backlog' }

        store.commit('devtel/issues/ADD_ISSUE', issue)

        expect(store.state.devtel.issues.issues).toHaveLength(1)
        expect(store.state.devtel.issues.issues[0].title).toBe('Test Issue')
    })

    it('Should update an issue in the store', () => {
        const store = createMockStore()
        const issue = { id: '1', title: 'Original', status: 'backlog' }

        store.commit('devtel/issues/ADD_ISSUE', issue)
        store.commit('devtel/issues/UPDATE_ISSUE', { id: '1', title: 'Updated', status: 'in_progress' })

        expect(store.state.devtel.issues.issues[0].title).toBe('Updated')
        expect(store.state.devtel.issues.issues[0].status).toBe('in_progress')
    })

    it('Should remove an issue from the store', () => {
        const store = createMockStore()

        store.commit('devtel/issues/ADD_ISSUE', { id: '1', title: 'Issue 1' })
        store.commit('devtel/issues/ADD_ISSUE', { id: '2', title: 'Issue 2' })
        store.commit('devtel/issues/REMOVE_ISSUE', '1')

        expect(store.state.devtel.issues.issues).toHaveLength(1)
        expect(store.state.devtel.issues.issues[0].id).toBe('2')
    })

    it('Should filter issues by status', () => {
        const store = createMockStore()

        store.commit('devtel/issues/SET_ISSUES', [
            { id: '1', title: 'Backlog 1', status: 'backlog' },
            { id: '2', title: 'In Progress', status: 'in_progress' },
            { id: '3', title: 'Backlog 2', status: 'backlog' },
        ])

        const backlogIssues = store.getters['devtel/issues/issuesByStatus']('backlog')
        expect(backlogIssues).toHaveLength(2)
    })
})
