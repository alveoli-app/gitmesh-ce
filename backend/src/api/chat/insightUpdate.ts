import { Request, Response } from 'express'
import { getServiceLogger } from '@gitmesh/logging'
import SequelizeRepository from '../../database/repositories/sequelizeRepository'
import { Error404 } from '@gitmesh/common'

export default async (req: Request, res: Response) => {
    const log = getServiceLogger()
    const { tenantId, id } = req.params
    const { status, dismissedReason } = req.body

    log.info(`[InsightUpdate] Updating insight ${id} for tenant ${tenantId}`)

    const transaction = await SequelizeRepository.createTransaction(req)

    try {
        const database = await SequelizeRepository.getSequelize(req)
        const { agentInsights } = database.models

        const insight = await agentInsights.findOne({
            where: { id, tenantId },
            transaction,
        })

        if (!insight) {
            throw new Error404('Insight not found')
        }

        const updates: any = {}
        if (status) updates.status = status
        if (status === 'dismissed') {
            updates.dismissedAt = new Date()
            if (dismissedReason) updates.dismissedReason = dismissedReason
        }

        await insight.update(updates, { transaction })

        await SequelizeRepository.commitTransaction(transaction)
        res.status(200).send(insight)
    } catch (error) {
        await SequelizeRepository.rollbackTransaction(transaction)
        log.error(error, '[InsightUpdate] Error updating insight')
        if (error instanceof Error404) {
            res.status(404).send(error.message)
        } else {
            res.status(500).send(error)
        }
    }
}
