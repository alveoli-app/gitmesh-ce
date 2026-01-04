
import { Logger } from '@gitmesh/logging'
import { IContextProvider, ContextChunk, ContextConfig } from './IContextProvider'

const TOKENS_PER_CHAR = 0.25

export class DevSpaceContextProvider implements IContextProvider {
    private log: Logger

    constructor(log: Logger) {
        this.log = log
    }

    getProviderId(): string {
        return 'devspace'
    }

    async getContext(
        conversationId: string,
        budget: number,
        config: ContextConfig,
        database: any,
        currentUser: any
    ): Promise<ContextChunk> {
        let currentTokens = 0
        const context: ContextChunk = { tokenCount: 0 }

        try {
            const conversation = await database.chatConversations.findByPk(conversationId)
            if (!conversation || !conversation.projectId) {
                return context
            }
            const projectId = conversation.projectId

            const promises: Promise<void>[] = []

            // Helper to add context if budget allows
            const addIfBudget = (key: string, data: any) => {
                const cost = this.estimateTokens(data)
                if (currentTokens + cost <= budget) {
                    context[key] = data
                    currentTokens += cost
                    context.tokenCount = currentTokens
                }
            }

            // 1. Project Context
            if (config.includeProject !== false) {
                promises.push((async () => {
                    try {
                        const project = await database.devtelProjects.findByPk(projectId, {
                            include: [{ model: database.user, as: 'lead', attributes: ['id', 'fullName', 'email'] }],
                        })
                        if (project) {
                            addIfBudget('project', {
                                id: project.id,
                                name: project.name,
                                description: project.description?.substring(0, 500),
                                status: project.status,
                                lead: project.lead ? { id: project.lead.id, name: project.lead.fullName } : null,
                            })
                        }
                    } catch (e: any) { this.log.warn({ error: e.message, projectId }, 'Failed to add project context') }
                })())
            }

            // 2. Cycle Context
            if (config.includeCycle !== false) {
                promises.push((async () => {
                    try {
                        const activeCycle = await database.devtelCycles.findOne({
                            where: { projectId, status: 'active', deletedAt: null },
                            include: [{ model: database.devtelIssues, as: 'issues', where: { deletedAt: null }, required: false, attributes: ['id', 'status', 'storyPoints'] }],
                        })
                        if (activeCycle) {
                            const issues = activeCycle.issues || []
                            const totalPoints = issues.reduce((sum: number, i: any) => sum + (i.storyPoints || 0), 0)
                            const completedPoints = issues.filter((i: any) => i.status === 'done').reduce((sum: number, i: any) => sum + (i.storyPoints || 0), 0)
                            addIfBudget('cycle', {
                                id: activeCycle.id,
                                name: activeCycle.name,
                                startDate: activeCycle.startDate,
                                endDate: activeCycle.endDate,
                                status: activeCycle.status,
                                metrics: {
                                    totalIssues: issues.length,
                                    completedIssues: issues.filter((i: any) => i.status === 'done').length,
                                    totalPoints,
                                    completedPoints,
                                    progressPercent: totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0,
                                }
                            })
                        }
                    } catch (e: any) { this.log.warn({ error: e.message, projectId }, 'Failed to add cycle context') }
                })())
            }

            // 3. Team Context
            if (config.includeTeam !== false) {
                promises.push((async () => {
                    try {
                        const teamMembers = await database.devtelIssueAssignments.findAll({
                            where: { projectId },
                            include: [{ model: database.user, as: 'user', attributes: ['id', 'fullName', 'email'] }],
                            attributes: ['userId', [database.Sequelize.fn('COUNT', database.Sequelize.col('issueId')), 'assignedCount']],
                            group: ['userId', 'user.id'],
                        })
                        const teamData = teamMembers.slice(0, 10).map((m: any) => ({
                            id: m.user?.id,
                            name: m.user?.fullName,
                            assignedIssues: parseInt(m.get('assignedCount')) || 0
                        }))
                        addIfBudget('team', teamData)
                    } catch (e: any) { this.log.warn({ error: e.message, projectId }, 'Failed to add team context') }
                })())
            }

            // 4. Recent Activity
            if (config.includeRecentActivity !== false) {
                promises.push((async () => {
                    try {
                        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                        const recentIssues = await database.devtelIssues.findAll({
                            where: { projectId, updatedAt: { [database.Sequelize.Op.gte]: sevenDaysAgo }, deletedAt: null },
                            order: [['updatedAt', 'DESC']],
                            limit: 10,
                            attributes: ['id', 'title', 'status', 'priority', 'updatedAt'],
                        })
                        const activity = recentIssues.map((i: any) => ({
                            type: 'issue_updated',
                            entityId: i.id,
                            title: i.title,
                            status: i.status,
                            timestamp: i.updatedAt
                        }))
                        addIfBudget('recentActivity', activity)
                    } catch (e: any) { this.log.warn({ error: e.message, projectId }, 'Failed to add recent activity') }
                })())
            }

            // 5. User Preferences
            if (config.includeUserPreferences !== false && currentUser) {
                promises.push((async () => {
                    try {
                        const savedFilters = await database.devtelUserSavedFilters.findAll({
                            where: { userId: currentUser.id },
                            limit: 5,
                            order: [['updatedAt', 'DESC']],
                            attributes: ['name', 'filters'],
                        })
                        addIfBudget('userPreferences', {
                            userId: currentUser.id,
                            savedFilters: savedFilters.map((f: any) => ({ name: f.name, filters: f.filters }))
                        })
                    } catch (e: any) { this.log.warn({ error: e.message }, 'Failed to add preferences') }
                })())
            }

            await Promise.all(promises)

        } catch (error: any) {
            this.log.error({ error: error.message }, 'DevSpaceProvider failed')
        }

        return context
    }

    private estimateTokens(data: any): number {
        const jsonStr = JSON.stringify(data)
        return Math.ceil(jsonStr.length * TOKENS_PER_CHAR)
    }
}
