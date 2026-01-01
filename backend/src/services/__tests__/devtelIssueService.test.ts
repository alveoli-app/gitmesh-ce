/**
 * DevTel Issue Service Unit Tests
 */
import DevtelIssueService from '../../api/devtel/issues/issueService'
import SequelizeTestUtils from '../../database/utils/sequelizeTestUtils'

const db = null

describe('DevtelIssueService tests', () => {
    beforeEach(async () => {
        await SequelizeTestUtils.wipeDatabase(db)
    })

    afterAll(async () => {
        await SequelizeTestUtils.closeConnection(db)
    })

    describe('Issue CRUD operations', () => {
        it('Should create an issue with required fields', async () => {
            const mockOptions = await SequelizeTestUtils.getTestIRepositoryOptions(db)

            // Mock project context
            const mockProject = { id: 'test-project-id', key: 'TEST' }

            const service = new DevtelIssueService(mockOptions, mockProject.id)

            const issueData = {
                title: 'Test Issue',
                type: 'story',
                status: 'backlog',
                priority: 'medium',
            }

            const issue = await service.create(issueData)

            expect(issue).toBeDefined()
            expect(issue.title).toBe('Test Issue')
            expect(issue.type).toBe('story')
            expect(issue.status).toBe('backlog')
            expect(issue.priority).toBe('medium')
            expect(issue.issueKey).toBeDefined()
        })

        it('Should update an issue', async () => {
            const mockOptions = await SequelizeTestUtils.getTestIRepositoryOptions(db)
            const mockProject = { id: 'test-project-id', key: 'TEST' }

            const service = new DevtelIssueService(mockOptions, mockProject.id)

            const issue = await service.create({
                title: 'Original Title',
                type: 'story',
                status: 'backlog',
            })

            const updated = await service.update(issue.id, {
                title: 'Updated Title',
                status: 'in_progress',
            })

            expect(updated.title).toBe('Updated Title')
            expect(updated.status).toBe('in_progress')
        })

        it('Should delete an issue (soft delete)', async () => {
            const mockOptions = await SequelizeTestUtils.getTestIRepositoryOptions(db)
            const mockProject = { id: 'test-project-id', key: 'TEST' }

            const service = new DevtelIssueService(mockOptions, mockProject.id)

            const issue = await service.create({
                title: 'To Delete',
                type: 'story',
                status: 'backlog',
            })

            await service.delete(issue.id)

            const deleted = await service.findById(issue.id)
            expect(deleted).toBeNull()
        })

        it('Should list issues with filters', async () => {
            const mockOptions = await SequelizeTestUtils.getTestIRepositoryOptions(db)
            const mockProject = { id: 'test-project-id', key: 'TEST' }

            const service = new DevtelIssueService(mockOptions, mockProject.id)

            await service.create({ title: 'Bug 1', type: 'bug', status: 'backlog', priority: 'high' })
            await service.create({ title: 'Story 1', type: 'story', status: 'backlog', priority: 'medium' })
            await service.create({ title: 'Bug 2', type: 'bug', status: 'in_progress', priority: 'urgent' })

            const bugs = await service.findAll({ type: 'bug' })
            expect(bugs.count).toBe(2)

            const highPriority = await service.findAll({ priority: 'high' })
            expect(highPriority.count).toBe(1)

            const inProgress = await service.findAll({ status: 'in_progress' })
            expect(inProgress.count).toBe(1)
        })
    })

    describe('Issue status transitions', () => {
        it('Should update issue status correctly', async () => {
            const mockOptions = await SequelizeTestUtils.getTestIRepositoryOptions(db)
            const mockProject = { id: 'test-project-id', key: 'TEST' }

            const service = new DevtelIssueService(mockOptions, mockProject.id)

            const issue = await service.create({
                title: 'Status Test',
                type: 'story',
                status: 'backlog',
            })

            // Transition through statuses
            let updated = await service.updateStatus(issue.id, 'in_progress')
            expect(updated.status).toBe('in_progress')

            updated = await service.updateStatus(issue.id, 'review')
            expect(updated.status).toBe('review')

            updated = await service.updateStatus(issue.id, 'done')
            expect(updated.status).toBe('done')
        })
    })

    describe('Bulk operations', () => {
        it('Should bulk update issues', async () => {
            const mockOptions = await SequelizeTestUtils.getTestIRepositoryOptions(db)
            const mockProject = { id: 'test-project-id', key: 'TEST' }

            const service = new DevtelIssueService(mockOptions, mockProject.id)

            const issue1 = await service.create({ title: 'Issue 1', type: 'story', status: 'backlog' })
            const issue2 = await service.create({ title: 'Issue 2', type: 'story', status: 'backlog' })
            const issue3 = await service.create({ title: 'Issue 3', type: 'story', status: 'in_progress' })

            const result = await service.bulkUpdate(
                [issue1.id, issue2.id],
                { priority: 'high' }
            )

            expect(result.updated).toBe(2)

            const updated1 = await service.findById(issue1.id)
            const updated2 = await service.findById(issue2.id)
            const unchanged = await service.findById(issue3.id)

            expect(updated1.priority).toBe('high')
            expect(updated2.priority).toBe('high')
            expect(unchanged.priority).not.toBe('high')
        })
    })

    describe('Story points', () => {
        it('Should calculate total story points for a cycle', async () => {
            const mockOptions = await SequelizeTestUtils.getTestIRepositoryOptions(db)
            const mockProject = { id: 'test-project-id', key: 'TEST' }

            const service = new DevtelIssueService(mockOptions, mockProject.id)

            await service.create({ title: 'Issue 1', type: 'story', status: 'backlog', storyPoints: 3 })
            await service.create({ title: 'Issue 2', type: 'story', status: 'backlog', storyPoints: 5 })
            await service.create({ title: 'Issue 3', type: 'story', status: 'backlog', storyPoints: 8 })

            const issues = await service.findAll({})
            const totalPoints = issues.rows.reduce((sum, i) => sum + (i.storyPoints || 0), 0)

            expect(totalPoints).toBe(16)
        })
    })
})
