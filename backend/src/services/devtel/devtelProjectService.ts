/**
 * DevTel Project Service - CRUD for projects
 */

import { Error400 } from '@gitmesh/common'
import { LoggerBase } from '@gitmesh/logging'
import { IServiceOptions } from '../IServiceOptions'
import SequelizeRepository from '../../database/repositories/sequelizeRepository'
import DevtelWorkspaceService from './devtelWorkspaceService'
import { sendNodeWorkerMessage } from '../../serverless/utils/nodeWorkerSQS'

export interface ProjectCreateData {
    name: string
    description?: string
    prefix?: string
    color?: string
    leadUserId?: string
    settings?: Record<string, any>
}

export interface ProjectUpdateData extends Partial<ProjectCreateData> {}

export default class DevtelProjectService extends LoggerBase {
    options: IServiceOptions

    constructor(options: IServiceOptions) {
        super(options.log)
        this.options = options
    }

    /**
     * Create a new project
     */
    async create(data: ProjectCreateData) {
        const transaction = await SequelizeRepository.createTransaction(this.options)

        try {
            const workspaceService = new DevtelWorkspaceService(this.options)
            const workspace = await workspaceService.getOrCreate()

            const project = await this.options.database.devtelProjects.create(
                {
                    workspaceId: workspace.id,
                    name: data.name,
                    description: data.description,
                    prefix: data.prefix,
                    color: data.color,
                    leadUserId: data.leadUserId,
                    settings: data.settings || {},
                    createdById: this.options.currentUser?.id,
                },
                { transaction },
            )

            await SequelizeRepository.commitTransaction(transaction)

            return this.findById(project.id)
        } catch (error) {
            await SequelizeRepository.rollbackTransaction(transaction)
            throw error
        }
    }

    /**
     * Find project by ID
     */
    async findById(id: string) {
        const workspaceService = new DevtelWorkspaceService(this.options)
        const workspace = await workspaceService.getForCurrentTenant()

        const project = await this.options.database.devtelProjects.findOne({
            where: {
                id,
                workspaceId: workspace.id,
                deletedAt: null,
            },
            include: [
                {
                    model: this.options.database.devtelCycles,
                    as: 'cycles',
                    where: { deletedAt: null },
                    required: false,
                    order: [['startDate', 'DESC']],
                    limit: 5,
                },
            ],
        })

        if (!project) {
            throw new Error400(this.options.language, 'devtel.project.notFound')
        }

        // Get issue counts
        const issueStats = await this.options.database.devtelIssues.findAll({
            where: {
                projectId: id,
                deletedAt: null,
            },
            attributes: [
                'status',
                [this.options.database.sequelize.fn('COUNT', '*'), 'count'],
            ],
            group: ['status'],
            raw: true,
        })

        return {
            ...project.get({ plain: true }),
            issueStats: issueStats.reduce((acc, stat: any) => {
                acc[stat.status] = parseInt(stat.count, 10)
                return acc
            }, {}),
        }
    }

    /**
     * List all projects for current workspace
     */
    async list(params: { limit?: number; offset?: number } = {}) {
        const workspaceService = new DevtelWorkspaceService(this.options)
        const workspace = await workspaceService.getForCurrentTenant()

        const where: any = {
            workspaceId: workspace.id,
            deletedAt: null,
        }

        const { rows, count } = await this.options.database.devtelProjects.findAndCountAll({
            where,
            order: [['createdAt', 'DESC']],
            limit: params.limit || 50,
            offset: params.offset || 0,
        })

        // Get issue counts for each project
        const projectIds = rows.map((p) => p.id)
        const issueCounts = await this.options.database.devtelIssues.findAll({
            where: {
                projectId: projectIds,
                deletedAt: null,
            },
            attributes: [
                'projectId',
                [this.options.database.sequelize.fn('COUNT', '*'), 'count'],
            ],
            group: ['projectId'],
            raw: true,
        })

        const countMap = issueCounts.reduce((acc, item: any) => {
            acc[item.projectId] = parseInt(item.count, 10)
            return acc
        }, {})

        return {
            rows: rows.map((p) => ({
                ...p.get({ plain: true }),
                issueCount: countMap[p.id] || 0,
            })),
            count,
        }
    }

    /**
     * Update a project
     */
    async update(id: string, data: ProjectUpdateData) {
        const transaction = await SequelizeRepository.createTransaction(this.options)

        try {
            const workspaceService = new DevtelWorkspaceService(this.options)
            const workspace = await workspaceService.getForCurrentTenant()

            const project = await this.options.database.devtelProjects.findOne({
                where: {
                    id,
                    workspaceId: workspace.id,
                    deletedAt: null,
                },
                transaction,
            })

            if (!project) {
                throw new Error400(this.options.language, 'devtel.project.notFound')
            }

            const updateFields: any = {}
            if (data.name !== undefined) updateFields.name = data.name
            if (data.description !== undefined) updateFields.description = data.description
            if (data.prefix !== undefined) updateFields.prefix = data.prefix
            if (data.color !== undefined) updateFields.color = data.color
            if (data.leadUserId !== undefined) updateFields.leadUserId = data.leadUserId
            if (data.settings !== undefined) {
                updateFields.settings = { ...project.settings, ...data.settings }
            }
            updateFields.updatedById = this.options.currentUser?.id

            await project.update(updateFields, { transaction })

            await SequelizeRepository.commitTransaction(transaction)

            // Trigger GitHub Sync if repo is configured
            if (data.settings?.githubRepo) {
               try {
                   const integration = await this.options.database.devtelIntegrations.findOne({
                        where: {
                            workspaceId: workspace.id,
                            provider: 'github',
                            deletedAt: null
                        }
                   });
                   
                   if (integration) {
                       this.log.info({ projectId: id, repo: data.settings.githubRepo }, 'Triggering repository backfill');
                       await sendNodeWorkerMessage(this.options.currentTenant.id, {
                           service: 'devtel-sync-external',
                           tenant: this.options.currentTenant.id,
                           workspaceId: workspace.id,
                           integrationId: integration.id,
                           provider: 'github',
                           syncType: 'full'
                       } as any); 
                   }
               } catch (syncError) {
                   this.log.error({ error: syncError }, 'Failed to trigger initial sync');
               }
            }

            return this.findById(id)
        } catch (error) {
            await SequelizeRepository.rollbackTransaction(transaction)
            throw error
        }
    }

    /**
     * Delete a project (soft delete)
     */
    async destroy(id: string) {
        const transaction = await SequelizeRepository.createTransaction(this.options)

        try {
            const workspaceService = new DevtelWorkspaceService(this.options)
            const workspace = await workspaceService.getForCurrentTenant()

            const project = await this.options.database.devtelProjects.findOne({
                where: {
                    id,
                    workspaceId: workspace.id,
                    deletedAt: null,
                },
                transaction,
            })

            if (!project) {
                throw new Error400(this.options.language, 'devtel.project.notFound')
            }

            // Permanently delete the project and all associated data (via DB Cascade)
            await project.destroy({ transaction, force: true })

            await SequelizeRepository.commitTransaction(transaction)

            return true
        } catch (error) {
            await SequelizeRepository.rollbackTransaction(transaction)
            throw error
        }
    }
}
