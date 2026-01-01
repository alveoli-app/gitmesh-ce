/**
 * DevTel Cycle Service Unit Tests
 */
import DevtelCycleService from '../../api/devtel/cycles/cycleService'
import SequelizeTestUtils from '../../database/utils/sequelizeTestUtils'

const db = null

describe('DevtelCycleService tests', () => {
    beforeEach(async () => {
        await SequelizeTestUtils.wipeDatabase(db)
    })

    afterAll(async () => {
        await SequelizeTestUtils.closeConnection(db)
    })

    describe('Cycle CRUD operations', () => {
        it('Should create a cycle', async () => {
            const mockOptions = await SequelizeTestUtils.getTestIRepositoryOptions(db)
            const mockProject = { id: 'test-project-id' }

            const service = new DevtelCycleService(mockOptions, mockProject.id)

            const cycleData = {
                name: 'Sprint 1',
                goal: 'Complete core features',
                startDate: new Date('2025-01-01'),
                endDate: new Date('2025-01-15'),
                status: 'planned',
            }

            const cycle = await service.create(cycleData)

            expect(cycle).toBeDefined()
            expect(cycle.name).toBe('Sprint 1')
            expect(cycle.goal).toBe('Complete core features')
            expect(cycle.status).toBe('planned')
        })

        it('Should list cycles by status', async () => {
            const mockOptions = await SequelizeTestUtils.getTestIRepositoryOptions(db)
            const mockProject = { id: 'test-project-id' }

            const service = new DevtelCycleService(mockOptions, mockProject.id)

            await service.create({ name: 'Sprint 1', status: 'completed', startDate: new Date(), endDate: new Date() })
            await service.create({ name: 'Sprint 2', status: 'active', startDate: new Date(), endDate: new Date() })
            await service.create({ name: 'Sprint 3', status: 'planned', startDate: new Date(), endDate: new Date() })

            const active = await service.findAll({ status: 'active' })
            expect(active.count).toBe(1)
            expect(active.rows[0].name).toBe('Sprint 2')

            const completed = await service.findAll({ status: 'completed' })
            expect(completed.count).toBe(1)
        })
    })

    describe('Cycle lifecycle', () => {
        it('Should start a planned cycle', async () => {
            const mockOptions = await SequelizeTestUtils.getTestIRepositoryOptions(db)
            const mockProject = { id: 'test-project-id' }

            const service = new DevtelCycleService(mockOptions, mockProject.id)

            const cycle = await service.create({
                name: 'Sprint 1',
                status: 'planned',
                startDate: new Date(),
                endDate: new Date(),
            })

            const started = await service.start(cycle.id)

            expect(started.status).toBe('active')
            expect(started.actualStartDate).toBeDefined()
        })

        it('Should complete an active cycle', async () => {
            const mockOptions = await SequelizeTestUtils.getTestIRepositoryOptions(db)
            const mockProject = { id: 'test-project-id' }

            const service = new DevtelCycleService(mockOptions, mockProject.id)

            const cycle = await service.create({
                name: 'Sprint 1',
                status: 'active',
                startDate: new Date(),
                endDate: new Date(),
            })

            const completed = await service.complete(cycle.id)

            expect(completed.status).toBe('completed')
            expect(completed.actualEndDate).toBeDefined()
        })

        it('Should not allow starting an already active cycle', async () => {
            const mockOptions = await SequelizeTestUtils.getTestIRepositoryOptions(db)
            const mockProject = { id: 'test-project-id' }

            const service = new DevtelCycleService(mockOptions, mockProject.id)

            const cycle = await service.create({
                name: 'Sprint 1',
                status: 'active',
                startDate: new Date(),
                endDate: new Date(),
            })

            await expect(service.start(cycle.id)).rejects.toThrow()
        })
    })

    describe('Sprint planning', () => {
        it('Should add issues to a cycle', async () => {
            const mockOptions = await SequelizeTestUtils.getTestIRepositoryOptions(db)
            const mockProject = { id: 'test-project-id' }

            const service = new DevtelCycleService(mockOptions, mockProject.id)

            const cycle = await service.create({
                name: 'Sprint 1',
                status: 'planned',
                startDate: new Date(),
                endDate: new Date(),
            })

            const issueIds = ['issue-1', 'issue-2', 'issue-3']

            const updated = await service.planIssues(cycle.id, issueIds)

            expect(updated.issueCount).toBe(3)
        })

        it('Should calculate cycle capacity', async () => {
            const mockOptions = await SequelizeTestUtils.getTestIRepositoryOptions(db)
            const mockProject = { id: 'test-project-id' }

            const service = new DevtelCycleService(mockOptions, mockProject.id)

            const cycle = await service.create({
                name: 'Sprint 1',
                status: 'planned',
                startDate: new Date('2025-01-01'),
                endDate: new Date('2025-01-15'),
                targetCapacity: 40,
            })

            expect(cycle.targetCapacity).toBe(40)
        })
    })

    describe('Burndown data', () => {
        it('Should generate burndown chart data', async () => {
            const mockOptions = await SequelizeTestUtils.getTestIRepositoryOptions(db)
            const mockProject = { id: 'test-project-id' }

            const service = new DevtelCycleService(mockOptions, mockProject.id)

            const cycle = await service.create({
                name: 'Sprint 1',
                status: 'active',
                startDate: new Date('2025-01-01'),
                endDate: new Date('2025-01-15'),
                storyPointsTotal: 40,
            })

            const burndown = await service.getBurndownData(cycle.id)

            expect(burndown).toBeDefined()
            expect(Array.isArray(burndown)).toBe(true)
        })
    })

    describe('Velocity calculation', () => {
        it('Should calculate velocity from completed cycles', async () => {
            const mockOptions = await SequelizeTestUtils.getTestIRepositoryOptions(db)
            const mockProject = { id: 'test-project-id' }

            const service = new DevtelCycleService(mockOptions, mockProject.id)

            await service.create({
                name: 'Sprint 1',
                status: 'completed',
                startDate: new Date(),
                endDate: new Date(),
                storyPointsCompleted: 35,
            })

            await service.create({
                name: 'Sprint 2',
                status: 'completed',
                startDate: new Date(),
                endDate: new Date(),
                storyPointsCompleted: 40,
            })

            await service.create({
                name: 'Sprint 3',
                status: 'completed',
                startDate: new Date(),
                endDate: new Date(),
                storyPointsCompleted: 38,
            })

            const velocity = await service.calculateAverageVelocity()

            expect(velocity).toBeCloseTo(37.67, 1)
        })
    })
})
