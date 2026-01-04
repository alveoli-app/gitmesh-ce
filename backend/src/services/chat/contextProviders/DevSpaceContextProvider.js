"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevSpaceContextProvider = void 0;
const TOKENS_PER_CHAR = 0.25;
class DevSpaceContextProvider {
    constructor(log) {
        this.log = log;
    }
    getProviderId() {
        return 'devspace';
    }
    async getContext(conversationId, budget, config, database, currentUser) {
        let currentTokens = 0;
        const context = { tokenCount: 0 };
        try {
            const conversation = await database.chatConversations.findByPk(conversationId);
            if (!conversation || !conversation.projectId) {
                return context;
            }
            const projectId = conversation.projectId;
            const promises = [];
            // Helper to add context if budget allows
            const addIfBudget = (key, data) => {
                const cost = this.estimateTokens(data);
                if (currentTokens + cost <= budget) {
                    context[key] = data;
                    currentTokens += cost;
                    context.tokenCount = currentTokens;
                }
            };
            // 1. Project Context
            if (config.includeProject !== false) {
                promises.push((async () => {
                    var _a;
                    try {
                        const project = await database.devtelProjects.findByPk(projectId, {
                            include: [{ model: database.user, as: 'lead', attributes: ['id', 'fullName', 'email'] }],
                        });
                        if (project) {
                            addIfBudget('project', {
                                id: project.id,
                                name: project.name,
                                description: (_a = project.description) === null || _a === void 0 ? void 0 : _a.substring(0, 500),
                                status: project.status,
                                lead: project.lead ? { id: project.lead.id, name: project.lead.fullName } : null,
                            });
                        }
                    }
                    catch (e) {
                        this.log.warn({ error: e.message, projectId }, 'Failed to add project context');
                    }
                })());
            }
            // 2. Cycle Context
            if (config.includeCycle !== false) {
                promises.push((async () => {
                    try {
                        const activeCycle = await database.devtelCycles.findOne({
                            where: { projectId, status: 'active', deletedAt: null },
                            include: [{ model: database.devtelIssues, as: 'issues', where: { deletedAt: null }, required: false, attributes: ['id', 'status', 'storyPoints'] }],
                        });
                        if (activeCycle) {
                            const issues = activeCycle.issues || [];
                            const totalPoints = issues.reduce((sum, i) => sum + (i.storyPoints || 0), 0);
                            const completedPoints = issues.filter((i) => i.status === 'done').reduce((sum, i) => sum + (i.storyPoints || 0), 0);
                            addIfBudget('cycle', {
                                id: activeCycle.id,
                                name: activeCycle.name,
                                startDate: activeCycle.startDate,
                                endDate: activeCycle.endDate,
                                status: activeCycle.status,
                                metrics: {
                                    totalIssues: issues.length,
                                    completedIssues: issues.filter((i) => i.status === 'done').length,
                                    totalPoints,
                                    completedPoints,
                                    progressPercent: totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0,
                                }
                            });
                        }
                    }
                    catch (e) {
                        this.log.warn({ error: e.message, projectId }, 'Failed to add cycle context');
                    }
                })());
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
                        });
                        const teamData = teamMembers.slice(0, 10).map((m) => {
                            var _a, _b;
                            return ({
                                id: (_a = m.user) === null || _a === void 0 ? void 0 : _a.id,
                                name: (_b = m.user) === null || _b === void 0 ? void 0 : _b.fullName,
                                assignedIssues: parseInt(m.get('assignedCount')) || 0
                            });
                        });
                        addIfBudget('team', teamData);
                    }
                    catch (e) {
                        this.log.warn({ error: e.message, projectId }, 'Failed to add team context');
                    }
                })());
            }
            // 4. Recent Activity
            if (config.includeRecentActivity !== false) {
                promises.push((async () => {
                    try {
                        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                        const recentIssues = await database.devtelIssues.findAll({
                            where: { projectId, updatedAt: { [database.Sequelize.Op.gte]: sevenDaysAgo }, deletedAt: null },
                            order: [['updatedAt', 'DESC']],
                            limit: 10,
                            attributes: ['id', 'title', 'status', 'priority', 'updatedAt'],
                        });
                        const activity = recentIssues.map((i) => ({
                            type: 'issue_updated',
                            entityId: i.id,
                            title: i.title,
                            status: i.status,
                            timestamp: i.updatedAt
                        }));
                        addIfBudget('recentActivity', activity);
                    }
                    catch (e) {
                        this.log.warn({ error: e.message, projectId }, 'Failed to add recent activity');
                    }
                })());
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
                        });
                        addIfBudget('userPreferences', {
                            userId: currentUser.id,
                            savedFilters: savedFilters.map((f) => ({ name: f.name, filters: f.filters }))
                        });
                    }
                    catch (e) {
                        this.log.warn({ error: e.message }, 'Failed to add preferences');
                    }
                })());
            }
            await Promise.all(promises);
        }
        catch (error) {
            this.log.error({ error: error.message }, 'DevSpaceProvider failed');
        }
        return context;
    }
    estimateTokens(data) {
        const jsonStr = JSON.stringify(data);
        return Math.ceil(jsonStr.length * TOKENS_PER_CHAR);
    }
}
exports.DevSpaceContextProvider = DevSpaceContextProvider;
//# sourceMappingURL=DevSpaceContextProvider.js.map