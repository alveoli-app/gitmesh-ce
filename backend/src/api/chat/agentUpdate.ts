import { Request, Response } from 'express'
import { getServiceLogger } from '@gitmesh/logging'
import SequelizeRepository from '../../database/repositories/sequelizeRepository'

/**
 * Update agent configuration
 */
export default async (req: Request, res: Response) => {
    const log = getServiceLogger()
    const { tenantId, agentId } = req.params
    const { isActive, configuration } = req.body

    log.info(`[AgentUpdate] Updating agent ${agentId} for tenant ${tenantId}`)

    const transaction = await SequelizeRepository.createTransaction(req)

    try {
        const database = await SequelizeRepository.getSequelize(req)
        const { agentConfigurations } = database.models

        const [config, created] = await agentConfigurations.findOrCreate({
            where: { tenantId, agentId },
            defaults: {
                tenantId,
                agentId,
                isActive: isActive ?? true,
                configuration: configuration ?? {},
            },
            transaction,
        })

        if (!created) {
            await config.update({
                isActive: isActive ?? config.isActive,
                configuration: configuration ?? config.configuration,
            }, { transaction })
        }

        await SequelizeRepository.commitTransaction(transaction)
        res.status(200).json(config)
    } catch (error) {
        await SequelizeRepository.rollbackTransaction(transaction)
        log.error(error, '[AgentUpdate] Error updating agent')
        res.status(500).json({ error: 'Failed to update agent configuration' })
    }
}
