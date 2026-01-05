import { Request, Response } from 'express'
import { getServiceLogger } from '@gitmesh/logging'

/**
 * List available agents and their configurations
 */
export default async (req: Request, res: Response) => {
    const log = getServiceLogger()
    const { tenantId } = req.params

    log.info(`[AgentList] Listing agents for tenant ${tenantId}`)

    // Return default agent configurations
    const agents = [
        {
            id: 'devspace-assistant',
            name: 'DevSpace Assistant',
            description: 'General purpose assistant for DevSpace operations',
            isActive: true,
            capabilities: ['chat', 'insights', 'actions'],
        },
        {
            id: 'cycle-planner',
            name: 'Cycle Planner',
            description: 'Helps plan and manage development cycles',
            isActive: true,
            capabilities: ['cycle-planning', 'capacity-analysis'],
        },
    ]

    res.status(200).json({ rows: agents, count: agents.length })
}
