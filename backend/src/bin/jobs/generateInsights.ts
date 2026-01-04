import cronGenerator from 'cron-time-generator'
import { getServiceLogger } from '@gitmesh/logging'
import { databaseInit } from '../../database/databaseConnection'
import { sendNodeWorkerMessage } from '../../serverless/utils/nodeWorkerSQS'
import { NodeWorkerMessageType } from '../../serverless/types/workerTypes'
import { GitmeshJob } from '../../types/jobTypes'

const job: GitmeshJob = {
    name: 'Generate Insights',
    // every 4 hours
    cronTime: cronGenerator.every(4).hours(),
    onTrigger: async () => {
        const log = getServiceLogger()
        const database = await databaseInit()

        // Fetch all active tenants
        const tenants = await database.tenant.findAll({
            attributes: ['id'],
        })

        log.info(`[GenerateInsights] Found ${tenants.length} tenants.`)

        for (const tenant of tenants) {
            // Fetch all active devtel projects for this tenant
            // We assume projects are relevant entities for analysis
            const projects = await database.devtelProjects.findAll({
                where: {
                    tenantId: tenant.id,
                    // Add status check if applicable, assuming default/all for now or active
                },
                attributes: ['id'],
            })

            log.info(`[GenerateInsights] Tenant ${tenant.id}: Found ${projects.length} projects.`)

            for (const project of projects) {
                await sendNodeWorkerMessage(tenant.id, {
                    type: NodeWorkerMessageType.GENERATE_INSIGHTS,
                    tenant: tenant.id,
                    projectId: project.id,
                } as any)
            }
        }
    },
}

export default job
