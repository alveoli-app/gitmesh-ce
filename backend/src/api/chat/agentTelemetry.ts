import { Request, Response } from 'express'
import { getServiceLogger } from '@gitmesh/logging'
import SequelizeRepository from '../../database/repositories/sequelizeRepository'
import { Op } from 'sequelize'

/**
 * Get agent telemetry data with summary statistics
 */
export default async (req: Request, res: Response) => {
    const log = getServiceLogger()
    const { tenantId } = req.params
    const { agentId } = req.query as any

    log.info(`[AgentTelemetry] Getting telemetry for tenant ${tenantId}`)

    const transaction = await SequelizeRepository.createTransaction(req)

    try {
        const database = await SequelizeRepository.getSequelize(req)
        const { agentTelemetry } = database.models

        // Get data from last 7 days
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const where: any = {
            tenantId,
            timestamp: { [Op.gte]: sevenDaysAgo }
        }
        if (agentId) where.agentName = agentId

        const records = await agentTelemetry.findAll({
            where,
            order: [['timestamp', 'DESC']],
            transaction,
        })

        // Calculate summary
        const totalTasks = records.length
        const totalTokens = records.reduce((sum, r) => sum + (r.tokensUsed || 0), 0)
        const successCount = records.filter(r => r.success).length
        const successRate = totalTasks > 0 ? Math.round((successCount / totalTasks) * 100) : 0

        // Calculate daily volume
        const dailyMap = new Map<string, number>()
        for (let i = 6; i >= 0; i--) {
            const date = new Date()
            date.setDate(date.getDate() - i)
            dailyMap.set(date.toISOString().split('T')[0], 0)
        }
        
        records.forEach(r => {
            const dateKey = new Date(r.timestamp).toISOString().split('T')[0]
            if (dailyMap.has(dateKey)) {
                dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + 1)
            }
        })

        const dailyVolume = Array.from(dailyMap.entries()).map(([date, count]) => ({
            date,
            count
        }))

        await SequelizeRepository.commitTransaction(transaction)
        
        res.status(200).json({
            summary: {
                totalTasks,
                totalTokens,
                successRate,
            },
            dailyVolume,
            records: records.slice(0, 50), // Return recent records too
        })
    } catch (error) {
        await SequelizeRepository.rollbackTransaction(transaction)
        log.error(error, '[AgentTelemetry] Error getting telemetry')
        res.status(500).json({ error: 'Failed to get agent telemetry' })
    }
}
