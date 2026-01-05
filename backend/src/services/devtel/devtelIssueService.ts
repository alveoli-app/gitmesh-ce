/**
 * DevTel Issue Service - CRUD and search for issues
 */

import { Error400 } from '@gitmesh/common'
import { LoggerBase } from '@gitmesh/logging'
import { IServiceOptions } from '../IServiceOptions'
import SequelizeRepository from '../../database/repositories/sequelizeRepository'
import DevtelWorkspaceService from './devtelWorkspaceService'

declare const global: any;

// Issue status enum
export const IssueStatus = {
    BACKLOG: 'backlog',
    TODO: 'todo',
    IN_PROGRESS: 'in_progress',
    REVIEW: 'review',
    DONE: 'done',
    BLOCKED: 'blocked',
} as const

// Issue priority enum
export const IssuePriority = {
    URGENT: 'urgent',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
} as const

export interface IssueCreateData {
    title: string
    description?: string
    status?: string
    priority?: string
    estimatedHours?: number
    storyPoints?: number
    assigneeId?: string
    cycleId?: string
    parentIssueId?: string
    metadata?: Record<string, any>
}

export interface IssueUpdateData extends Partial<IssueCreateData> {
    actualHours?: number
    complexityScore?: number
    scheduledDate?: string | null
}

export interface IssueSearchParams {
    query?: string
    status?: string[]
    priority?: string[]
    assigneeIds?: string[]
    cycleId?: string
    hasNoCycle?: boolean
    limit?: number
    offset?: number
    orderBy?: string
    orderDirection?: 'asc' | 'desc'
}

export default class DevtelIssueService extends LoggerBase {
    options: IServiceOptions

    constructor(options: IServiceOptions) {
        super(options.log)
        this.options = options
    }

    get req() {
        return (this.options as any).req
    }

    /**
     * Create a new issue
     */
    async create(projectId: string, data: IssueCreateData) {
        this.log.info({ projectId, data }, 'DevtelIssueService.create - START')
        const transaction = await SequelizeRepository.createTransaction(this.options)

        try {
            // Verify project exists and belongs to workspace
            this.log.info({ projectId }, 'Verifying project access...')
            const project = await this.verifyProjectAccess(projectId, transaction)
            this.log.info({ projectId, workspaceId: project.workspaceId }, 'Project access verified')

            // Validate assignee if provided
            if (data.assigneeId) {
                this.log.info({ assigneeId: data.assigneeId }, 'Verifying assignee...')
                await this.verifyUserAccess(data.assigneeId, transaction)
            }

            // Validate member assignee if provided (for team members who haven't logged in)
            if (data.assigneeMemberId) {
                this.log.info({ assigneeMemberId: data.assigneeMemberId }, 'Verifying member assignee...')
                await this.verifyMemberAccess(data.assigneeMemberId, transaction)
            }

            // Validate cycle if provided
            if (data.cycleId) {
                this.log.info({ cycleId: data.cycleId }, 'Verifying cycle...')
                await this.verifyCycleAccess(data.cycleId, projectId, transaction)
            }

            // Validate parent issue if provided
            if (data.parentIssueId) {
                this.log.info({ parentIssueId: data.parentIssueId }, 'Verifying parent issue...')
                await this.verifyIssueAccess(data.parentIssueId, projectId, transaction)
            }

            this.log.info('Creating issue in database...')
            const issue = await this.options.database.devtelIssues.create(
                {
                    projectId,
                    title: data.title,
                    description: data.description,
                    status: data.status || IssueStatus.BACKLOG,
                    priority: data.priority || IssuePriority.MEDIUM,
                    estimatedHours: data.estimatedHours,
                    storyPoints: data.storyPoints,
                    assigneeId: data.assigneeId,
                    assigneeMemberId: data.assigneeMemberId,
                    cycleId: data.cycleId,
                    parentIssueId: data.parentIssueId,
                    metadata: data.metadata || {},
                    createdById: this.options.currentUser?.id,
                },
                { transaction },
            )
            this.log.info({ issueId: issue.id }, 'Issue created in database')

            // Create assignment if assignee is set
            if (data.assigneeId) {
                this.log.info({ issueId: issue.id, assigneeId: data.assigneeId }, 'Creating assignment...')
                await this.options.database.devtelIssueAssignments.create(
                    {
                        issueId: issue.id,
                        userId: data.assigneeId,
                        allocatedHours: data.estimatedHours,
                        role: 'assignee',
                    },
                    { transaction },
                )
            }

            this.log.info('Committing transaction...')
            await SequelizeRepository.commitTransaction(transaction)
            this.log.info('Transaction committed')

            // Trigger async indexing to OpenSearch
            this.triggerSearchIndex(issue.id)

            // Fetch the full issue with relations for the response
            const fullIssue = await this.findById(projectId, issue.id)

            // Broadcast via Socket.IO
            if (this.req?.io?.devtel) {
                this.req.io.devtel.emitIssueCreated(projectId, fullIssue)
            }

            this.log.info({ issueId: issue.id }, 'DevtelIssueService.create - SUCCESS')
            return fullIssue
        } catch (error) {
            this.log.error({
                error: error.message,
                stack: error.stack,
                projectId,
                data
            }, 'DevtelIssueService.create - ERROR')
            await SequelizeRepository.rollbackTransaction(transaction)
            throw error
        }
    }

    /**
     * Update an issue
     */
    async update(projectId: string, issueId: string, data: IssueUpdateData) {
        const transaction = await SequelizeRepository.createTransaction(this.options)

        try {
            const issue = await this.options.database.devtelIssues.findOne({
                where: {
                    id: issueId,
                    projectId,
                    deletedAt: null,
                },
                transaction,
            })

            if (!issue) {
                throw new Error400(this.options.language, 'devtel.issue.notFound')
            }

            const oldStatus = issue.status

            // Update fields
            const updateFields: any = {}
            if (data.title !== undefined) updateFields.title = data.title
            if (data.description !== undefined) updateFields.description = data.description
            if (data.status !== undefined) updateFields.status = data.status
            if (data.priority !== undefined) updateFields.priority = data.priority
            if (data.estimatedHours !== undefined) updateFields.estimatedHours = data.estimatedHours
            if (data.actualHours !== undefined) updateFields.actualHours = data.actualHours
            if (data.storyPoints !== undefined) updateFields.storyPoints = data.storyPoints
            if (data.complexityScore !== undefined) updateFields.complexityScore = data.complexityScore
            if (data.cycleId !== undefined) updateFields.cycleId = data.cycleId
            if (data.metadata !== undefined) {
                updateFields.metadata = { ...issue.metadata, ...data.metadata }
            }

            // Handle assignee change
            if (data.assigneeId !== undefined && data.assigneeId !== issue.assigneeId) {
                updateFields.assigneeId = data.assigneeId
                // Clear member assignee if user assignee is set
                if (data.assigneeId) {
                    updateFields.assigneeMemberId = null
                }

                // Remove old assignment
                if (issue.assigneeId) {
                    await this.options.database.devtelIssueAssignments.destroy({
                        where: {
                            issueId,
                            userId: issue.assigneeId,
                            role: 'assignee',
                        },
                        transaction,
                    })
                }

                // Create new assignment
                if (data.assigneeId) {
                    await this.verifyUserAccess(data.assigneeId, transaction)
                    await this.options.database.devtelIssueAssignments.create(
                        {
                            issueId,
                            userId: data.assigneeId,
                            allocatedHours: data.estimatedHours || issue.estimatedHours,
                            role: 'assignee',
                        },
                        { transaction },
                    )
                }
            }

            // Handle member assignee change (for team members who haven't logged in)
            if (data.assigneeMemberId !== undefined && data.assigneeMemberId !== issue.assigneeMemberId) {
                updateFields.assigneeMemberId = data.assigneeMemberId
                // Clear user assignee if member assignee is set
                if (data.assigneeMemberId) {
                    updateFields.assigneeId = null
                    // Remove old user assignment if exists
                    if (issue.assigneeId) {
                        await this.options.database.devtelIssueAssignments.destroy({
                            where: {
                                issueId,
                                userId: issue.assigneeId,
                                role: 'assignee',
                            },
                            transaction,
                        })
                    }
                }
                // Verify member exists
                if (data.assigneeMemberId) {
                    await this.verifyMemberAccess(data.assigneeMemberId, transaction)
                }
            }

            // Handle scheduledDate update (for existing assignment)
            if (data.scheduledDate !== undefined && issue.assigneeId) {
                await this.options.database.devtelIssueAssignments.update(
                    { scheduledDate: data.scheduledDate },
                    {
                        where: {
                            issueId,
                            userId: issue.assigneeId,
                            role: 'assignee',
                        },
                        transaction,
                    }
                )
            }

            updateFields.updatedById = this.options.currentUser?.id
            await issue.update(updateFields, { transaction })

            await SequelizeRepository.commitTransaction(transaction)

                // Trigger async indexing
                this.triggerSearchIndex(issueId)

                // Fetch updated issue with all relations
                const updatedIssue = await this.findById(projectId, issueId)

                // Broadcast via Socket.IO
                if (this.req?.io?.devtel) {
                    // If status changed, emit specific event
                    if (data.status && data.status !== issue.status) {
                        this.req.io.devtel.emitIssueStatusChanged(projectId, updatedIssue, issue.status)
                    } else {
                        this.req.io.devtel.emitIssueUpdated(projectId, updatedIssue)
                    }
                }

                // If moved to done, trigger velocity calculation
                if (data.status === IssueStatus.DONE && oldStatus !== IssueStatus.DONE) {
                    this.triggerVelocityCalculation(projectId, issue.cycleId)
                }

                return updatedIssue
            } catch (error) {
                await SequelizeRepository.rollbackTransaction(transaction)
                throw error
            }
        }

    /**
     * Bulk update issues
     */
    async bulkUpdate(projectId: string, issueIds: string[], data: IssueUpdateData) {
        const results = []
        for (const issueId of issueIds) {
            try {
                const result = await this.update(projectId, issueId, data)
                results.push({ id: issueId, success: true, data: result })
            } catch (error) {
                results.push({ id: issueId, success: false, error: error.message })
            }
        }
        return results
    }

    /**
     * Find issue by ID with relations
     */
    async findById(projectId: string, issueId: string) {
        const issue = await this.options.database.devtelIssues.findOne({
            where: {
                    id: issueId,
                    projectId,
                    deletedAt: null,
                },
                include: [
                    {
                        model: this.options.database.user,
                        as: 'assignee',
                        attributes: ['id', 'fullName', 'email', 'firstName', 'lastName'],
                        required: false,
                    },
                    {
                        model: this.options.database.member,
                        as: 'assigneeMember',
                        attributes: ['id', 'displayName', 'emails', 'attributes'],
                        required: false,
                    },
                    {
                        model: this.options.database.devtelCycles,
                        as: 'cycle',
                        attributes: ['id', 'name', 'status', 'startDate', 'endDate'],
                        required: false,
                    },
                    {
                        model: this.options.database.devtelIssues,
                        as: 'parentIssue',
                        attributes: ['id', 'title', 'status'],
                    },
                    {
                        model: this.options.database.devtelIssues,
                        as: 'childIssues',
                        where: { deletedAt: null },
                        required: false,
                        attributes: ['id', 'title', 'status', 'priority'],
                    },
                    {
                        model: this.options.database.devtelExternalLinks,
                        as: 'externalLinks',
                        where: { linkableType: 'issue' },
                        required: false,
                    },
                ],
        })

        if (!issue) {
            throw new Error400(this.options.language, 'devtel.issue.notFound')
        }

        return issue
    }

    /**
     * List issues for a project with filtering
     */
    async list(projectId: string, params: IssueSearchParams = {}) {
        const where: any = {
            projectId,
            deletedAt: null,
        }

        if (params.status?.length) {
            where.status = params.status
        }

        if (params.priority?.length) {
            where.priority = params.priority
        }

        if (params.assigneeIds?.length) {
            where.assigneeId = params.assigneeIds
        }

        if (params.cycleId) {
            where.cycleId = params.cycleId
        }

        if (params.hasNoCycle) {
            where.cycleId = null
        }

        const order: any = []
        if (params.orderBy) {
            order.push([params.orderBy, params.orderDirection || 'asc'])
        } else {
            order.push(['createdAt', 'desc'])
        }

        console.log('DevtelIssueService.list query:', { where, limit: params.limit, offset: params.offset })

        const { rows, count } = await this.options.database.devtelIssues.findAndCountAll({
            where,
            include: [
                {
                    model: this.options.database.user,
                    as: 'assignee',
                    attributes: ['id', 'fullName', 'email', 'firstName', 'lastName'],
                    required: false,
                },
                {
                    model: this.options.database.member,
                    as: 'assigneeMember',
                    attributes: ['id', 'displayName', 'emails', 'attributes'],
                    required: false,
                },
                {
                    model: this.options.database.devtelExternalLinks,
                    as: 'externalLinks',
                    where: { linkableType: 'issue' },
                    required: false,
                },
            ],
            order,
            limit: params.limit || 50,
            offset: params.offset || 0,
        })

        return { rows, count }
    }

    /**
     * Delete an issue (soft delete)
     */
    async destroy(projectId: string, issueId: string) {
        const transaction = await SequelizeRepository.createTransaction(this.options)

        try {
            const issue = await this.options.database.devtelIssues.findOne({
                where: {
                    id: issueId,
                    projectId,
                    deletedAt: null,
                },
                transaction,
            })

            if (!issue) {
                throw new Error400(this.options.language, 'devtel.issue.notFound')
            }

            await issue.update(
                {
                    deletedAt: new Date(),
                    updatedById: this.options.currentUser?.id,
                },
                { transaction },
            )

            await SequelizeRepository.commitTransaction(transaction)

            // Remove from OpenSearch
            this.triggerSearchRemove(issueId)

            // Broadcast deletion
            this.broadcastIssueChange('issue.deleted', projectId, { id: issueId })

            return true
        } catch (error) {
            await SequelizeRepository.rollbackTransaction(transaction)
            throw error
        }
    }

    // ============================================
    // Helper methods
    // ============================================

    private async verifyProjectAccess(projectId: string, transaction: any) {
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

    private async verifyUserAccess(userId: string, transaction: any) {
        const user = await this.options.database.user.findOne({
            where: { id: userId },
            transaction,
        })

        if (!user) {
            throw new Error400(this.options.language, 'devtel.user.notFound')
        }

        return user
    }

    private async verifyMemberAccess(memberId: string, transaction: any) {
        const member = await this.options.database.member.findOne({
            where: { 
                id: memberId,
                deletedAt: null,
            },
            transaction,
        })

        if (!member) {
            throw new Error400(this.options.language, 'devtel.member.notFound')
        }

        return member
    }

    private async verifyCycleAccess(cycleId: string, projectId: string, transaction: any) {
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

        return cycle
    }

    private async verifyIssueAccess(issueId: string, projectId: string, transaction: any) {
        const issue = await this.options.database.devtelIssues.findOne({
            where: {
                id: issueId,
                projectId,
                deletedAt: null,
            },
            transaction,
        })

        if (!issue) {
            throw new Error400(this.options.language, 'devtel.issue.notFound')
        }

        return issue
    }

    private async triggerSearchIndex(issueId: string) {
        // Will be implemented with Temporal workflow
        this.log.info({ issueId }, 'Triggering OpenSearch index for issue')
        // TODO: Trigger temporal workflow
    }

    private async triggerSearchRemove(issueId: string) {
        // Will be implemented with Temporal workflow
        this.log.info({ issueId }, 'Triggering OpenSearch removal for issue')
        // TODO: Trigger temporal workflow
    }

    private async triggerVelocityCalculation(projectId: string, cycleId?: string) {
        // Will be implemented with Temporal workflow
        this.log.info({ projectId, cycleId }, 'Triggering velocity calculation')
        // TODO: Trigger temporal workflow
    }

    private broadcastIssueChange(event: string, projectId: string, data: any, extra?: any) {
        try {
            this.log.info({ event, projectId, issueId: data?.id }, 'Broadcasting issue change')

            // Emit via Socket.IO
            const globalAny = global as any
            if (globalAny.devtelWebSocket) {
                switch (event) {
                    case 'issue.created':
                        globalAny.devtelWebSocket.emitIssueCreated(projectId, data)
                        break
                    case 'issue.updated':
                        if (extra?.oldStatus && extra.oldStatus !== data.status) {
                            globalAny.devtelWebSocket.emitIssueStatusChanged(projectId, data, extra.oldStatus)
                        } else {
                            globalAny.devtelWebSocket.emitIssueUpdated(projectId, data)
                        }
                        break
                    case 'issue.deleted':
                        globalAny.devtelWebSocket.emitIssueDeleted(projectId, data.id)
                        break
                    default:
                        this.log.warn({ event }, 'Unknown issue event type')
                }
            } else {
                this.log.warn('DevTel WebSocket namespace not available')
            }
        } catch (error) {
            this.log.error(error, 'Failed to broadcast issue change')
        }
    }
}
