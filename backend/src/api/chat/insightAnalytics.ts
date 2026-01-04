import { Request, Response } from 'express'
import { getServiceLogger } from '@gitmesh/logging'
import SequelizeRepository from '../../database/repositories/sequelizeRepository'
import { QueryTypes } from 'sequelize'

export default async (req: Request, res: Response) => {
    const log = getServiceLogger()
    const { tenantId } = req.params
    const { range } = req.query as any // e.g., '7d', '30d'

    log.info(`[InsightAnalytics] Getting analytics for tenant ${tenantId}`)

    const transaction = await SequelizeRepository.createTransaction(req)

    try {
        const database = await SequelizeRepository.getSequelize(req)

        // Safety check just in case, though usually this is raw SQL or ORM aggregations
        // We'll use simple counts for now
        const { agentInsights } = database.models

        const totalCount = await agentInsights.count({ where: { tenantId }, transaction })

        // Group by status
        const statusDistribution = await agentInsights.findAll({
            attributes: ['status', [database.fn('COUNT', database.col('id')), 'count']],
            where: { tenantId },
            group: ['status'],
            raw: true,
            transaction
        })

        // Group by category
        const categoryDistribution = await agentInsights.findAll({
            attributes: ['category', [database.fn('COUNT', database.col('id')), 'count']],
            where: { tenantId },
            group: ['category'],
            raw: true,
            transaction
        })

        // Group by severity
        const severityDistribution = await agentInsights.findAll({
            attributes: ['severity', [database.fn('COUNT', database.col('id')), 'count']],
            where: { tenantId },
            group: ['severity'],
            raw: true,
            transaction
        })

        await SequelizeRepository.commitTransaction(transaction)

        res.status(200).send({
            total: totalCount,
            byStatus: statusDistribution,
            byCategory: categoryDistribution,
            bySeverity: severityDistribution
        })
    } catch (error) {
        await SequelizeRepository.rollbackTransaction(transaction)
        log.error(error, '[InsightAnalytics] Error getting analytics')
        res.status(500).send(error)
    }
}
