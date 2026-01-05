/**
 * DevTel Cycle Service - Sprint/Cycle management
 */

import { Error400 } from '@gitmesh/common'
import { LoggerBase } from '@gitmesh/logging'
import { IServiceOptions } from '../IServiceOptions'
import SequelizeRepository from '../../database/repositories/sequelizeRepository'
import DevtelWorkspaceService from './devtelWorkspaceService'
import { Op } from 'sequelize'

export const CycleStatus = {
    PLANNED: 'planned',
    ACTIVE: 'active',
    COMPLETED: 'completed',
} as const

export interface CycleCreateData {
    name: string
    goal?: string
    startDate: Date
    endDate: Date
    targetCapacity?: number
}

export interface CycleUpdateData extends Partial<CycleCreateData> {
    status?: string
}

export default class DevtelCycleService extends LoggerBase {
    options: IServiceOptions

    constructor(options: IServiceOptions) {
        super(options.log)
        this.options = options
    }

    /**
     * Create a new cycle
     */
    async create(projectId: string, data: CycleCreateData) {
        const transaction = await SequelizeRepository.createTransaction(this.options)

        try {
            await this.verifyProjectAccess(projectId, transaction)

            // Validate dates
            if (new Date(data.startDate) >= new Date(data.endDate)) {
                throw new Error400(this.options.language, 'devtel.cycle.invalidDates')
            }

            const cycle = await this.options.database.devtelCycles.create(
                {
                    projectId,
                    name: data.name,
                    goal: data.goal,
                    startDate: data.startDate,
                    endDate: data.endDate,
                    targetCapacity: data.targetCapacity,
                    status: CycleStatus.PLANNED,
                    createdById: this.options.currentUser?.id,
                },
                { transaction },
            )

            await SequelizeRepository.commitTransaction(transaction)

            return this.findById(projectId, cycle.id)
        } catch (error) {
            await SequelizeRepository.rollbackTransaction(transaction)
            throw error
        }
    }

    /**
     * Find cycle by ID with issue stats
     */
    async findById(projectId: string, cycleId: string) {
        const cycle = await this.options.database.devtelCycles.findOne({
            where: {
                id: cycleId,
                projectId,
                deletedAt: null,
            },
        })

        if (!cycle) {
            throw new Error400(this.options.language, 'devtel.cycle.notFound')
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
        })

        const stats = {
            totalIssues: 0,
            completedIssues: 0,
            inProgressIssues: 0,
            blockedIssues: 0,
            totalEstimatedHours: 0,
            totalActualHours: 0,
            totalStoryPoints: 0,
            completedStoryPoints: 0,
        }

        for (const stat of issueStats as any[]) {
            const count = parseInt(stat.count, 10)
            stats.totalIssues += count
            stats.totalEstimatedHours += parseFloat(stat.estimatedHours) || 0
            stats.totalActualHours += parseFloat(stat.actualHours) || 0
            stats.totalStoryPoints += parseInt(stat.storyPoints, 10) || 0

            if (stat.status === 'done') {
                stats.completedIssues = count
                stats.completedStoryPoints = parseInt(stat.storyPoints, 10) || 0
            } else if (stat.status === 'in_progress' || stat.status === 'review') {
                stats.inProgressIssues += count
            } else if (stat.status === 'blocked') {
                stats.blockedIssues = count
            }
        }

        return {
            ...cycle.get({ plain: true }),
            stats,
        }
    }

    /**
     * List cycles for a project
     */
    async list(projectId: string, params: { status?: string; limit?: number; offset?: number; includeStats?: boolean } = {}) {
        await this.verifyProjectAccess(projectId)

        const where: any = {
            projectId,
            deletedAt: null,
        }

        if (params.status) {
            where.status = params.status
        }

        const { rows, count } = await this.options.database.devtelCycles.findAndCountAll({
            where,
            order: [['startDate', 'DESC']],
            limit: params.limit || 50,
            offset: params.offset || 0,
        })

        // If includeStats is true, fetch stats for each cycle
        if (params.includeStats) {
            const cyclesWithStats = await Promise.all(
                rows.map(async (cycle) => {
                    const cycleWithStats = await this.findById(projectId, cycle.id)
                    return cycleWithStats
                })
            )
            return { rows: cyclesWithStats, count }
        }

        return { rows, count }
    }

    /**
     * Get active cycle for a project
     */
    async getActive(projectId: string) {
        await this.verifyProjectAccess(projectId)

        const cycle = await this.options.database.devtelCycles.findOne({
            where: {
                projectId,
                status: CycleStatus.ACTIVE,
                deletedAt: null,
            },
        })

        if (!cycle) {
            return null
        }

        return this.findById(projectId, cycle.id)
    }

    /**
     * Update a cycle
     */
    async update(projectId: string, cycleId: string, data: CycleUpdateData) {
        const transaction = await SequelizeRepository.createTransaction(this.options)

        try {
            const cycle = await this.options.database.devtelCycles.findOne({
                where: {
                    id: cycleId,
                    projectId,
                    deletedAt: null,
                },
                transaction,
            })

            if (!cycle) {
                throw new Error400(this.options.language, 'devtel.cycle.notFound')
            }

            const updateFields: any = {}
            if (data.name !== undefined) updateFields.name = data.name
            if (data.goal !== undefined) updateFields.goal = data.goal
            if (data.startDate !== undefined) updateFields.startDate = data.startDate
            if (data.endDate !== undefined) updateFields.endDate = data.endDate
            if (data.targetCapacity !== undefined) updateFields.targetCapacity = data.targetCapacity
            if (data.status !== undefined) {
                // If activating, ensure no other active cycle
                if (data.status === CycleStatus.ACTIVE && cycle.status !== CycleStatus.ACTIVE) {
                    await this.options.database.devtelCycles.update(
                        { status: CycleStatus.PLANNED },
                        {
                            where: {
                                projectId,
                                status: CycleStatus.ACTIVE,
                                deletedAt: null,
                            },
                            transaction,
                        },
                    )
                }

                // If completing, calculate velocity
                if (data.status === CycleStatus.COMPLETED && cycle.status !== CycleStatus.COMPLETED) {
                    const completedIssues = await this.options.database.devtelIssues.count({
                        where: {
                            cycleId,
                            status: 'done',
                            deletedAt: null,
                        },
                        transaction,
                    })

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
                    })

                    updateFields.velocity = completedIssues
                    updateFields.storyPointsCompleted = (storyPointsResult as any)?.total || 0
                }

                updateFields.status = data.status
            }

            updateFields.updatedById = this.options.currentUser?.id
            await cycle.update(updateFields, { transaction })

            await SequelizeRepository.commitTransaction(transaction)

            return this.findById(projectId, cycleId)
        } catch (error) {
            await SequelizeRepository.rollbackTransaction(transaction)
            throw error
        }
    }

    /**
     * Start a cycle (transition from planned to active)
     */
    async start(projectId: string, cycleId: string) {
        const transaction = await SequelizeRepository.createTransaction(this.options)

        try {
            const cycle = await this.options.database.devtelCycles.findOne({
                where: {
                    id: cycleId,
                    projectId,
                    deletedAt: null,
                },
                transaction,
            })

            if (!cycle) {
                throw new Error400(this.options.language, 'devtel.cycle.notFound')
            }

            if (cycle.status !== CycleStatus.PLANNED) {
                throw new Error400(this.options.language, 'devtel.cycle.cannotStart')
            }

            // Deactivate any currently active cycles
            await this.options.database.devtelCycles.update(
                { status: CycleStatus.PLANNED },
                {
                    where: {
                        projectId,
                        status: CycleStatus.ACTIVE,
                        deletedAt: null,
                    },
                    transaction,
                },
            )

            // Start this cycle
            await cycle.update(
                {
                    status: CycleStatus.ACTIVE,
                    actualStartDate: new Date(),
                    updatedById: this.options.currentUser?.id,
                },
                { transaction },
            )

            await SequelizeRepository.commitTransaction(transaction)

            return this.findById(projectId, cycleId)
        } catch (error) {
            await SequelizeRepository.rollbackTransaction(transaction)
            throw error
        }
    }

    /**
     * Complete a cycle (transition from active to completed)
     */
    async complete(projectId: string, cycleId: string) {
        const transaction = await SequelizeRepository.createTransaction(this.options)

        try {
            const cycle = await this.options.database.devtelCycles.findOne({
                where: {
                    id: cycleId,
                    projectId,
                    deletedAt: null,
                },
                transaction,
            })

            if (!cycle) {
                throw new Error400(this.options.language, 'devtel.cycle.notFound')
            }

            if (cycle.status !== CycleStatus.ACTIVE) {
                throw new Error400(this.options.language, 'devtel.cycle.cannotComplete')
            }

            // Calculate final velocity
            const completedIssues = await this.options.database.devtelIssues.count({
                where: {
                    cycleId,
                    status: 'done',
                    deletedAt: null,
                },
                transaction,
            })

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
            })

            // Complete this cycle
            await cycle.update(
                {
                    status: CycleStatus.COMPLETED,
                    actualEndDate: new Date(),
                    velocity: completedIssues,
                    storyPointsCompleted: (storyPointsResult as any)?.total || 0,
                    updatedById: this.options.currentUser?.id,
                },
                { transaction },
            )

            await SequelizeRepository.commitTransaction(transaction)

            return this.findById(projectId, cycleId)
        } catch (error) {
            await SequelizeRepository.rollbackTransaction(transaction)
            throw error
        }
    }

    /**
     * Get burndown data for a cycle
     */
    async getBurndown(projectId: string, cycleId: string) {
        const cycle = await this.findById(projectId, cycleId)

        // Get snapshots
        const snapshots = await this.options.database.devtelCycleSnapshots.findAll({
            where: { cycleId },
            order: [['snapshotDate', 'ASC']],
        })

        // Calculate ideal burndown
        const startDate = new Date(cycle.startDate)
        const endDate = new Date(cycle.endDate)
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        const totalIssues = cycle.stats.totalIssues

        const idealBurndown = []
        for (let i = 0; i <= totalDays; i++) {
            const date = new Date(startDate)
            date.setDate(date.getDate() + i)
            idealBurndown.push({
                date: date.toISOString().split('T')[0],
                remaining: Math.round(totalIssues * (1 - i / totalDays)),
            })
        }

        // Map snapshots to actual burndown
        const actualBurndown = snapshots.map((s) => ({
            date: s.snapshotDate,
            remaining: s.totalIssues - s.completedIssues,
            completed: s.completedIssues,
            inProgress: s.inProgressIssues,
        }))

        return {
            cycle,
            idealBurndown,
            actualBurndown,
        }
    }

    /**
     * Plan sprint - move issues to cycle
     * Issues can be moved between cycles freely, including incomplete issues from previous sprints
     */
    async planSprint(projectId: string, cycleId: string, issueIds: string[]) {
        const transaction = await SequelizeRepository.createTransaction(this.options)

        try {
            const cycle = await this.options.database.devtelCycles.findOne({
                where: {
                    id: cycleId,
                    projectId,
                    deletedAt: null,
                },
                transaction,
            })

            if (!cycle) {
                throw new Error400(this.options.language, 'devtel.cycle.notFound')
            }

            // Update issues to belong to this cycle
            // This allows moving issues from any state (backlog, previous sprints, etc.)
            await this.options.database.devtelIssues.update(
                {
                    cycleId,
                    updatedById: this.options.currentUser?.id,
                },
                {
                    where: {
                        id: issueIds,
                        projectId,
                        deletedAt: null,
                    },
                    transaction,
                },
            )

            await SequelizeRepository.commitTransaction(transaction)

            return this.findById(projectId, cycleId)
        } catch (error) {
            await SequelizeRepository.rollbackTransaction(transaction)
            throw error
        }
    }
    
    /**
     * Move incomplete issues from one cycle to another
     * Useful for carrying over unfinished work to the next sprint
     */
    async moveIncompleteIssues(projectId: string, fromCycleId: string, toCycleId: string) {
        const transaction = await SequelizeRepository.createTransaction(this.options)

        try {
            // Verify both cycles exist
            const [fromCycle, toCycle] = await Promise.all([
                this.options.database.devtelCycles.findOne({
                    where: { id: fromCycleId, projectId, deletedAt: null },
                    transaction,
                }),
                this.options.database.devtelCycles.findOne({
                    where: { id: toCycleId, projectId, deletedAt: null },
                    transaction,
                }),
            ])

            if (!fromCycle || !toCycle) {
                throw new Error400(this.options.language, 'devtel.cycle.notFound')
            }

            // Move all incomplete issues (not in 'done' status)
            const result = await this.options.database.devtelIssues.update(
                {
                    cycleId: toCycleId,
                    updatedById: this.options.currentUser?.id,
                },
                {
                    where: {
                        cycleId: fromCycleId,
                        projectId,
                        status: { [Op.ne]: 'done' },
                        deletedAt: null,
                    },
                    transaction,
                },
            )

            await SequelizeRepository.commitTransaction(transaction)

            return {
                movedCount: result[0],
                fromCycle: fromCycle.get({ plain: true }),
                toCycle: toCycle.get({ plain: true }),
            }
        } catch (error) {
            await SequelizeRepository.rollbackTransaction(transaction)
            throw error
        }
    }

    /**
     * Delete a cycle (soft delete with archive)
     * Cycles are archived for 30 days before permanent deletion
     */
    async destroy(projectId: string, cycleId: string) {
        const transaction = await SequelizeRepository.createTransaction(this.options)

        try {
            const cycle = await this.options.database.devtelCycles.findOne({
                where: {
                    id: cycleId,
                    projectId,
                    deletedAt: null,
                },
                transaction,
            })

            if (!cycle) {
                throw new Error400(this.options.language, 'devtel.cycle.notFound')
            }

            // Unassign issues from this cycle
            await this.options.database.devtelIssues.update(
                { cycleId: null },
                {
                    where: { cycleId },
                    transaction,
                },
            )

            const now = new Date()
            const permanentDeleteDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days from now

            await cycle.update(
                {
                    deletedAt: now,
                    archivedAt: now,
                    permanentDeleteAt: permanentDeleteDate,
                    updatedById: this.options.currentUser?.id,
                },
                { transaction },
            )

            await SequelizeRepository.commitTransaction(transaction)

            return true
        } catch (error) {
            await SequelizeRepository.rollbackTransaction(transaction)
            throw error
        }
    }

    /**
     * List archived cycles (soft deleted, within 30-day retention)
     */
    async listArchived(projectId: string, params: { limit?: number; offset?: number } = {}) {
        await this.verifyProjectAccess(projectId)

        const now = new Date()

        const { rows, count } = await this.options.database.devtelCycles.findAndCountAll({
            where: {
                projectId,
                archivedAt: { [Op.ne]: null },
                permanentDeleteAt: { [Op.gt]: now }, // Not yet permanently deleted
            },
            order: [['archivedAt', 'DESC']],
            limit: params.limit || 50,
            offset: params.offset || 0,
            paranoid: false, // Include soft-deleted records
        })

        return { rows, count }
    }

    /**
     * Restore an archived cycle
     */
    async restore(projectId: string, cycleId: string) {
        const transaction = await SequelizeRepository.createTransaction(this.options)

        try {
            const cycle = await this.options.database.devtelCycles.findOne({
                where: {
                    id: cycleId,
                    projectId,
                    archivedAt: { [Op.ne]: null },
                },
                transaction,
                paranoid: false,
            })

            if (!cycle) {
                throw new Error400(this.options.language, 'devtel.cycle.notFound')
            }

            await cycle.update(
                {
                    deletedAt: null,
                    archivedAt: null,
                    permanentDeleteAt: null,
                    updatedById: this.options.currentUser?.id,
                },
                { transaction },
            )

            await SequelizeRepository.commitTransaction(transaction)

            return this.findById(projectId, cycleId)
        } catch (error) {
            await SequelizeRepository.rollbackTransaction(transaction)
            throw error
        }
    }

    /**
     * Permanently delete archived cycles that have exceeded retention period
     * This should be run as a scheduled job
     */
    async cleanupExpiredArchives() {
        const now = new Date()

        const expiredCycles = await this.options.database.devtelCycles.findAll({
            where: {
                archivedAt: { [Op.ne]: null },
                permanentDeleteAt: { [Op.lte]: now },
            },
            paranoid: false,
        })

        for (const cycle of expiredCycles) {
            await cycle.destroy({ force: true }) // Hard delete
        }

        return expiredCycles.length
    }

    // ============================================
    // Helper methods
    // ============================================

    private async verifyProjectAccess(projectId: string, transaction?: any) {
        const workspaceService = new DevtelWorkspaceService(this.options)
        const workspace = await workspaceService.getForCurrentTenant()

        const project = await this.options.database.devtelProjects.findOne({
            where: {
                id: projectId,
                workspaceId: workspace.id,
                deletedAt: null,
            },
            transaction,
        })

        if (!project) {
            throw new Error400(this.options.language, 'devtel.project.notFound')
        }

        return project
    }
}
