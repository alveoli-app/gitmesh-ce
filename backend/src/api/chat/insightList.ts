import { Request, Response } from 'express'
import { getServiceLogger } from '@gitmesh/logging'
import SequelizeRepository from '../../database/repositories/sequelizeRepository'
import { Error400 } from '@gitmesh/common'

export default async (req: Request, res: Response) => {
    const log = getServiceLogger()
    const { tenantId } = req.params
    const { status, type, projectId, limit, offset } = req.query as any

    log.info(`[InsightList] Listing insights for tenant ${tenantId}`)

    const transaction = await SequelizeRepository.createTransaction(req)

    try {
        const database = await SequelizeRepository.getSequelize(req)
        const { agentInsights } = database.models

        const where: any = { tenantId }
        if (status) where.status = status
        if (type) where.insightType = type
        if (projectId) where.projectId = projectId

        const insights = await agentInsights.findAndCountAll({
            where,
            limit: limit ? parseInt(limit, 10) : 50,
            offset: offset ? parseInt(offset, 10) : 0,
            order: [['createdAt', 'DESC']],
            transaction,
        })

        await SequelizeRepository.commitTransaction(transaction)
        res.status(200).send(insights)
    } catch (error) {
        await SequelizeRepository.rollbackTransaction(transaction)
        log.error(error, '[InsightList] Error listing insights')
        res.status(500).send(error)
    }
}
