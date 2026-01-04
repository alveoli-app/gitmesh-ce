/**
 * Receive telemetry data from CrewAI Python service
 * Internal endpoint for storing agent performance metrics
 */
export default async (req, res) => {
    // Validate service token
    const serviceToken = req.headers['x-service-token']
    const expectedToken = process.env.CREWAI_SERVICE_TOKEN || 'dev-token'

    if (serviceToken !== expectedToken) {
        return res.status(401).json({ error: 'Invalid service token' })
    }

    const { tenantId, agentName, taskType, durationMs, tokensUsed, success, errorMessage, metadata } = req.body

    if (!tenantId || !agentName || !taskType) {
        return res.status(400).json({ error: 'Missing required fields' })
    }

    try {
        await req.database.agentTelemetry.create({
            tenantId,
            agentName,
            taskType,
            durationMs: durationMs || 0,
            tokensUsed: tokensUsed || 0,
            success: success !== false,
            errorMessage: errorMessage || null,
            metadata: metadata || {},
            timestamp: new Date(),
        })

        res.status(201).json({ success: true })
    } catch (error: any) {
        req.log.error('Failed to store telemetry:', error)
        res.status(500).json({ error: 'Failed to store telemetry' })
    }
}
