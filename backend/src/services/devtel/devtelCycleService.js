"use strict";
/**
 * DevTel Cycle Service - Sprint/Cycle management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CycleStatus = void 0;
const common_1 = require("@gitmesh/common");
const logging_1 = require("@gitmesh/logging");
const sequelizeRepository_1 = __importDefault(require("../../database/repositories/sequelizeRepository"));
const devtelWorkspaceService_1 = __importDefault(require("./devtelWorkspaceService"));
exports.CycleStatus = {
    PLANNED: 'planned',
    ACTIVE: 'active',
    COMPLETED: 'completed',
};
class DevtelCycleService extends logging_1.LoggerBase {
    constructor(options) {
        super(options.log);
        this.options = options;
    }
    /**
     * Create a new cycle
     */
    async create(projectId, data) {
        var _a;
        const transaction = await sequelizeRepository_1.default.createTransaction(this.options);
        try {
            await this.verifyProjectAccess(projectId, transaction);
            // Validate dates
            if (new Date(data.startDate) >= new Date(data.endDate)) {
                throw new common_1.Error400(this.options.language, 'devtel.cycle.invalidDates');
            }
            const cycle = await this.options.database.devtelCycles.create({
                projectId,
                name: data.name,
                goal: data.goal,
                startDate: data.startDate,
                endDate: data.endDate,
                status: exports.CycleStatus.PLANNED,
                createdById: (_a = this.options.currentUser) === null || _a === void 0 ? void 0 : _a.id,
            }, { transaction });
            await sequelizeRepository_1.default.commitTransaction(transaction);
            return this.findById(projectId, cycle.id);
        }
        catch (error) {
            await sequelizeRepository_1.default.rollbackTransaction(transaction);
            throw error;
        }
    }
    /**
     * Find cycle by ID with issue stats
     */
    async findById(projectId, cycleId) {
        const cycle = await this.options.database.devtelCycles.findOne({
            where: {
                id: cycleId,
                projectId,
                deletedAt: null,
            },
        });
        if (!cycle) {
            throw new common_1.Error400(this.options.language, 'devtel.cycle.notFound');
        }
        // Get issue statistics
        const issueStats = await this.options.database.devtelIssues.findAll({
            where: {
                cycleId,
                deletedAt: null,
            },
            attributes: [
                'status',
                [this.options.database.sequelize.fn('COUNT', '*'), 'count'],
                [this.options.database.sequelize.fn('SUM', this.options.database.sequelize.col('estimatedHours')), 'estimatedHours'],
                [this.options.database.sequelize.fn('SUM', this.options.database.sequelize.col('actualHours')), 'actualHours'],
                [this.options.database.sequelize.fn('SUM', this.options.database.sequelize.col('storyPoints')), 'storyPoints'],
            ],
            group: ['status'],
            raw: true,
        });
        const stats = {
            totalIssues: 0,
            completedIssues: 0,
            inProgressIssues: 0,
            blockedIssues: 0,
            totalEstimatedHours: 0,
            totalActualHours: 0,
            totalStoryPoints: 0,
            completedStoryPoints: 0,
        };
        for (const stat of issueStats) {
            const count = parseInt(stat.count, 10);
            stats.totalIssues += count;
            stats.totalEstimatedHours += parseFloat(stat.estimatedHours) || 0;
            stats.totalActualHours += parseFloat(stat.actualHours) || 0;
            stats.totalStoryPoints += parseInt(stat.storyPoints, 10) || 0;
            if (stat.status === 'done') {
                stats.completedIssues = count;
                stats.completedStoryPoints = parseInt(stat.storyPoints, 10) || 0;
            }
            else if (stat.status === 'in_progress' || stat.status === 'review') {
                stats.inProgressIssues += count;
            }
            else if (stat.status === 'blocked') {
                stats.blockedIssues = count;
            }
        }
        return Object.assign(Object.assign({}, cycle.get({ plain: true })), { stats });
    }
    /**
     * List cycles for a project
     */
    async list(projectId, params = {}) {
        await this.verifyProjectAccess(projectId);
        const where = {
            projectId,
            deletedAt: null,
        };
        if (params.status) {
            where.status = params.status;
        }
        const { rows, count } = await this.options.database.devtelCycles.findAndCountAll({
            where,
            order: [['startDate', 'DESC']],
            limit: params.limit || 50,
            offset: params.offset || 0,
        });
        return { rows, count };
    }
    /**
     * Get active cycle for a project
     */
    async getActive(projectId) {
        await this.verifyProjectAccess(projectId);
        const cycle = await this.options.database.devtelCycles.findOne({
            where: {
                projectId,
                status: exports.CycleStatus.ACTIVE,
                deletedAt: null,
            },
        });
        if (!cycle) {
            return null;
        }
        return this.findById(projectId, cycle.id);
    }
    /**
     * Update a cycle
     */
    async update(projectId, cycleId, data) {
        var _a;
        const transaction = await sequelizeRepository_1.default.createTransaction(this.options);
        try {
            const cycle = await this.options.database.devtelCycles.findOne({
                where: {
                    id: cycleId,
                    projectId,
                    deletedAt: null,
                },
                transaction,
            });
            if (!cycle) {
                throw new common_1.Error400(this.options.language, 'devtel.cycle.notFound');
            }
            const updateFields = {};
            if (data.name !== undefined)
                updateFields.name = data.name;
            if (data.goal !== undefined)
                updateFields.goal = data.goal;
            if (data.startDate !== undefined)
                updateFields.startDate = data.startDate;
            if (data.endDate !== undefined)
                updateFields.endDate = data.endDate;
            if (data.status !== undefined) {
                // If activating, ensure no other active cycle
                if (data.status === exports.CycleStatus.ACTIVE && cycle.status !== exports.CycleStatus.ACTIVE) {
                    await this.options.database.devtelCycles.update({ status: exports.CycleStatus.PLANNED }, {
                        where: {
                            projectId,
                            status: exports.CycleStatus.ACTIVE,
                            deletedAt: null,
                        },
                        transaction,
                    });
                }
                // If completing, calculate velocity
                if (data.status === exports.CycleStatus.COMPLETED && cycle.status !== exports.CycleStatus.COMPLETED) {
                    const completedIssues = await this.options.database.devtelIssues.count({
                        where: {
                            cycleId,
                            status: 'done',
                            deletedAt: null,
                        },
                        transaction,
                    });
                    const storyPointsResult = await this.options.database.devtelIssues.findOne({
                        where: {
                            cycleId,
                            status: 'done',
                            deletedAt: null,
                        },
                        attributes: [
                            [this.options.database.sequelize.fn('SUM', this.options.database.sequelize.col('storyPoints')), 'total'],
                        ],
                        raw: true,
                        transaction,
                    });
                    updateFields.velocity = completedIssues;
                    updateFields.storyPointsCompleted = (storyPointsResult === null || storyPointsResult === void 0 ? void 0 : storyPointsResult.total) || 0;
                }
                updateFields.status = data.status;
            }
            updateFields.updatedById = (_a = this.options.currentUser) === null || _a === void 0 ? void 0 : _a.id;
            await cycle.update(updateFields, { transaction });
            await sequelizeRepository_1.default.commitTransaction(transaction);
            return this.findById(projectId, cycleId);
        }
        catch (error) {
            await sequelizeRepository_1.default.rollbackTransaction(transaction);
            throw error;
        }
    }
    /**
     * Start a cycle (transition from planned to active)
     */
    async start(projectId, cycleId) {
        var _a;
        const transaction = await sequelizeRepository_1.default.createTransaction(this.options);
        try {
            const cycle = await this.options.database.devtelCycles.findOne({
                where: {
                    id: cycleId,
                    projectId,
                    deletedAt: null,
                },
                transaction,
            });
            if (!cycle) {
                throw new common_1.Error400(this.options.language, 'devtel.cycle.notFound');
            }
            if (cycle.status !== exports.CycleStatus.PLANNED) {
                throw new common_1.Error400(this.options.language, 'devtel.cycle.cannotStart');
            }
            // Deactivate any currently active cycles
            await this.options.database.devtelCycles.update({ status: exports.CycleStatus.PLANNED }, {
                where: {
                    projectId,
                    status: exports.CycleStatus.ACTIVE,
                    deletedAt: null,
                },
                transaction,
            });
            // Start this cycle
            await cycle.update({
                status: exports.CycleStatus.ACTIVE,
                actualStartDate: new Date(),
                updatedById: (_a = this.options.currentUser) === null || _a === void 0 ? void 0 : _a.id,
            }, { transaction });
            await sequelizeRepository_1.default.commitTransaction(transaction);
            return this.findById(projectId, cycleId);
        }
        catch (error) {
            await sequelizeRepository_1.default.rollbackTransaction(transaction);
            throw error;
        }
    }
    /**
     * Complete a cycle (transition from active to completed)
     */
    async complete(projectId, cycleId) {
        var _a;
        const transaction = await sequelizeRepository_1.default.createTransaction(this.options);
        try {
            const cycle = await this.options.database.devtelCycles.findOne({
                where: {
                    id: cycleId,
                    projectId,
                    deletedAt: null,
                },
                transaction,
            });
            if (!cycle) {
                throw new common_1.Error400(this.options.language, 'devtel.cycle.notFound');
            }
            if (cycle.status !== exports.CycleStatus.ACTIVE) {
                throw new common_1.Error400(this.options.language, 'devtel.cycle.cannotComplete');
            }
            // Calculate final velocity
            const completedIssues = await this.options.database.devtelIssues.count({
                where: {
                    cycleId,
                    status: 'done',
                    deletedAt: null,
                },
                transaction,
            });
            const storyPointsResult = await this.options.database.devtelIssues.findOne({
                where: {
                    cycleId,
                    status: 'done',
                    deletedAt: null,
                },
                attributes: [
                    [this.options.database.sequelize.fn('SUM', this.options.database.sequelize.col('storyPoints')), 'total'],
                ],
                raw: true,
                transaction,
            });
            // Complete this cycle
            await cycle.update({
                status: exports.CycleStatus.COMPLETED,
                actualEndDate: new Date(),
                velocity: completedIssues,
                storyPointsCompleted: (storyPointsResult === null || storyPointsResult === void 0 ? void 0 : storyPointsResult.total) || 0,
                updatedById: (_a = this.options.currentUser) === null || _a === void 0 ? void 0 : _a.id,
            }, { transaction });
            await sequelizeRepository_1.default.commitTransaction(transaction);
            return this.findById(projectId, cycleId);
        }
        catch (error) {
            await sequelizeRepository_1.default.rollbackTransaction(transaction);
            throw error;
        }
    }
    /**
     * Get burndown data for a cycle
     */
    async getBurndown(projectId, cycleId) {
        const cycle = await this.findById(projectId, cycleId);
        // Get snapshots
        const snapshots = await this.options.database.devtelCycleSnapshots.findAll({
            where: { cycleId },
            order: [['snapshotDate', 'ASC']],
        });
        // Calculate ideal burndown
        const startDate = new Date(cycle.startDate);
        const endDate = new Date(cycle.endDate);
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const totalIssues = cycle.stats.totalIssues;
        const idealBurndown = [];
        for (let i = 0; i <= totalDays; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            idealBurndown.push({
                date: date.toISOString().split('T')[0],
                remaining: Math.round(totalIssues * (1 - i / totalDays)),
            });
        }
        // Map snapshots to actual burndown
        const actualBurndown = snapshots.map((s) => ({
            date: s.snapshotDate,
            remaining: s.totalIssues - s.completedIssues,
            completed: s.completedIssues,
            inProgress: s.inProgressIssues,
        }));
        return {
            cycle,
            idealBurndown,
            actualBurndown,
        };
    }
    /**
     * Plan sprint - move issues to cycle
     */
    async planSprint(projectId, cycleId, issueIds) {
        var _a;
        const transaction = await sequelizeRepository_1.default.createTransaction(this.options);
        try {
            const cycle = await this.options.database.devtelCycles.findOne({
                where: {
                    id: cycleId,
                    projectId,
                    deletedAt: null,
                },
                transaction,
            });
            if (!cycle) {
                throw new common_1.Error400(this.options.language, 'devtel.cycle.notFound');
            }
            // Update issues to belong to this cycle
            await this.options.database.devtelIssues.update({
                cycleId,
                updatedById: (_a = this.options.currentUser) === null || _a === void 0 ? void 0 : _a.id,
            }, {
                where: {
                    id: issueIds,
                    projectId,
                    deletedAt: null,
                },
                transaction,
            });
            await sequelizeRepository_1.default.commitTransaction(transaction);
            return this.findById(projectId, cycleId);
        }
        catch (error) {
            await sequelizeRepository_1.default.rollbackTransaction(transaction);
            throw error;
        }
    }
    /**
     * Delete a cycle (soft delete)
     */
    async destroy(projectId, cycleId) {
        var _a;
        const transaction = await sequelizeRepository_1.default.createTransaction(this.options);
        try {
            const cycle = await this.options.database.devtelCycles.findOne({
                where: {
                    id: cycleId,
                    projectId,
                    deletedAt: null,
                },
                transaction,
            });
            if (!cycle) {
                throw new common_1.Error400(this.options.language, 'devtel.cycle.notFound');
            }
            // Unassign issues from this cycle
            await this.options.database.devtelIssues.update({ cycleId: null }, {
                where: { cycleId },
                transaction,
            });
            await cycle.update({
                deletedAt: new Date(),
                updatedById: (_a = this.options.currentUser) === null || _a === void 0 ? void 0 : _a.id,
            }, { transaction });
            await sequelizeRepository_1.default.commitTransaction(transaction);
            return true;
        }
        catch (error) {
            await sequelizeRepository_1.default.rollbackTransaction(transaction);
            throw error;
        }
    }
    // ============================================
    // Helper methods
    // ============================================
    async verifyProjectAccess(projectId, transaction) {
        const workspaceService = new devtelWorkspaceService_1.default(this.options);
        const workspace = await workspaceService.getForCurrentTenant();
        const project = await this.options.database.devtelProjects.findOne({
            where: {
                id: projectId,
                workspaceId: workspace.id,
                deletedAt: null,
            },
            transaction,
        });
        if (!project) {
            throw new common_1.Error400(this.options.language, 'devtel.project.notFound');
        }
        return project;
    }
}
exports.default = DevtelCycleService;
//# sourceMappingURL=devtelCycleService.js.map