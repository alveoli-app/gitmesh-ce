/**
 * DevTel AI Workflow Tests
 * Tests for the CrewAI service integration
 */
import axios from 'axios'

const CREWAI_URL = process.env.CREWAI_SERVICE_URL || 'http://localhost:8001'
const SERVICE_TOKEN = process.env.CREWAI_SERVICE_TOKEN || 'dev-token'

const client = axios.create({
    baseURL: CREWAI_URL,
    headers: { 'X-Service-Token': SERVICE_TOKEN },
    timeout: 30000,
})

describe('DevTel AI Workflows', () => {
    describe('Health Check', () => {
        it('Should return healthy status', async () => {
            const response = await client.get('/health')

            expect(response.status).toBe(200)
            expect(response.data.status).toBe('healthy')
            expect(response.data.provider).toBeDefined()
        })
    })

    describe('Prioritize Issues', () => {
        it('Should prioritize a list of issues', async () => {
            const issues = [
                { id: '1', title: 'Critical bug in login', priority: 'urgent' },
                { id: '2', title: 'Add dark mode', priority: 'low' },
                { id: '3', title: 'Performance optimization', priority: 'high' },
            ]

            const response = await client.post('/workflows/prioritize', {
                workspaceId: 'test-workspace',
                userId: 'test-user',
                input: { issues },
            })

            expect(response.status).toBe(200)
            expect(response.data.prioritized).toBeDefined()
            expect(Array.isArray(response.data.prioritized)).toBe(true)
            expect(response.data.reasoning).toBeDefined()
        })

        it('Should handle empty issues list', async () => {
            const response = await client.post('/workflows/prioritize', {
                workspaceId: 'test-workspace',
                userId: 'test-user',
                input: { issues: [] },
            })

            expect(response.status).toBe(200)
            expect(response.data.prioritized).toEqual([])
        })
    })

    describe('Suggest Sprint', () => {
        it('Should suggest issues for a sprint based on capacity', async () => {
            const backlog = [
                { id: '1', title: 'Feature A', storyPoints: 5, priority: 'high' },
                { id: '2', title: 'Feature B', storyPoints: 8, priority: 'medium' },
                { id: '3', title: 'Feature C', storyPoints: 3, priority: 'urgent' },
                { id: '4', title: 'Feature D', storyPoints: 13, priority: 'low' },
            ]

            const response = await client.post('/workflows/suggest-sprint', {
                workspaceId: 'test-workspace',
                userId: 'test-user',
                input: { backlog, targetCapacity: 20 },
            })

            expect(response.status).toBe(200)
            expect(response.data.suggested).toBeDefined()
            expect(response.data.totalPoints).toBeLessThanOrEqual(20)
        })
    })

    describe('Breakdown Issue', () => {
        it('Should break down an issue into subtasks', async () => {
            const issue = {
                id: '1',
                title: 'Implement user authentication',
                description: 'Add login, signup, and password reset functionality',
            }

            const response = await client.post('/workflows/breakdown', {
                workspaceId: 'test-workspace',
                userId: 'test-user',
                input: { issue },
            })

            expect(response.status).toBe(200)
            expect(response.data.subtasks).toBeDefined()
            expect(Array.isArray(response.data.subtasks)).toBe(true)
            expect(response.data.subtasks.length).toBeGreaterThan(0)
        })
    })

    describe('Suggest Assignee', () => {
        it('Should suggest team members for an issue', async () => {
            const issue = {
                id: '1',
                title: 'Fix database performance issue',
                type: 'bug',
            }

            const team = [
                { id: 'u1', name: 'Alice', skills: ['backend', 'database'], currentWorkload: 5 },
                { id: 'u2', name: 'Bob', skills: ['frontend'], currentWorkload: 3 },
                { id: 'u3', name: 'Charlie', skills: ['backend', 'devops'], currentWorkload: 8 },
            ]

            const response = await client.post('/workflows/suggest-assignee', {
                workspaceId: 'test-workspace',
                userId: 'test-user',
                input: { issue, team },
            })

            expect(response.status).toBe(200)
            expect(response.data.suggestions).toBeDefined()
            expect(Array.isArray(response.data.suggestions)).toBe(true)
        })

        it('Should handle empty team', async () => {
            const response = await client.post('/workflows/suggest-assignee', {
                workspaceId: 'test-workspace',
                userId: 'test-user',
                input: { issue: { id: '1' }, team: [] },
            })

            expect(response.status).toBe(200)
            expect(response.data.suggestions).toEqual([])
        })
    })

    describe('Generate Spec', () => {
        it('Should generate a PRD from title and description', async () => {
            const response = await client.post('/workflows/generate-spec', {
                workspaceId: 'test-workspace',
                userId: 'test-user',
                input: {
                    title: 'User Dashboard',
                    description: 'A dashboard showing user statistics and recent activity',
                },
            })

            expect(response.status).toBe(200)
            expect(response.data.title).toBe('User Dashboard')
            expect(response.data.content).toBeDefined()
        })
    })

    describe('Authentication', () => {
        it('Should reject requests without service token', async () => {
            const unauthClient = axios.create({
                baseURL: CREWAI_URL,
                timeout: 5000,
            })

            try {
                await unauthClient.post('/workflows/prioritize', {
                    workspaceId: 'test',
                    userId: 'test',
                    input: { issues: [] },
                })
                fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.response.status).toBe(401)
            }
        })

        it('Should reject requests with invalid token', async () => {
            const badClient = axios.create({
                baseURL: CREWAI_URL,
                headers: { 'X-Service-Token': 'invalid-token' },
                timeout: 5000,
            })

            try {
                await badClient.post('/workflows/prioritize', {
                    workspaceId: 'test',
                    userId: 'test',
                    input: { issues: [] },
                })
                fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.response.status).toBe(401)
            }
        })
    })
})
