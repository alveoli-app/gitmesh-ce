import { asyncWrap } from '../middleware/error'
import { WebhooksRepository } from '../repos/webhooks.repo'
import { Error400BadRequest } from '@gitmesh/common'
import { getServiceTracer } from '@gitmesh/tracing'
import { IntegrationStreamWorkerEmitter } from '@gitmesh/sqs'
import { WebhookType } from '@gitmesh/types'
import express from 'express'
import { verifyWebhookSignature } from '../utils/crypto'

const tracer = getServiceTracer()

export const installGroupsIoRoutes = async (app: express.Express) => {
  let emitter: IntegrationStreamWorkerEmitter
  app.post(
    '/groupsio',
    asyncWrap(async (req, res) => {
      const signature = req.headers['x-groupsio-signature'] as string
      const event = req.headers['x-groupsio-action'] as string
      const data = req.body

      const groupName = data?.group?.name

      if (!groupName) {
        throw new Error400BadRequest('Missing group name!')
      }

      const repo = new WebhooksRepository(req.dbStore, req.log)

      const integration = await repo.findGroupsIoIntegrationByGroupName(groupName)

      if (integration) {
        // Validate webhook signature if webhook secret is configured
        const settings = integration.settings as any
        const webhookSecret = settings?.webhookSecret

        if (webhookSecret) {
          if (!signature) {
            req.log.warn(
              { integrationId: integration.id, groupName },
              'Groups.io webhook rejected: missing signature header',
            )
            res.status(401).send({
              message: 'Missing webhook signature',
            })
            return
          }

          // Verify signature
          const payload = JSON.stringify(data)
          const isValid = verifyWebhookSignature(payload, webhookSecret, signature)

          if (!isValid) {
            req.log.warn(
              { integrationId: integration.id, groupName },
              'Groups.io webhook rejected: invalid signature',
            )
            res.status(401).send({
              message: 'Invalid webhook signature',
            })
            return
          }

          req.log.debug({ integrationId: integration.id }, 'Groups.io webhook signature validated')
        } else {
          req.log.warn(
            { integrationId: integration.id },
            'Groups.io webhook received but no webhook secret configured - accepting without validation',
          )
        }

        req.log.info({ integrationId: integration.id, event }, 'Incoming Groups.io Webhook!')

        const result = await repo.createIncomingWebhook(
          integration.tenantId,
          integration.id,
          WebhookType.GROUPSIO,
          {
            signature,
            event,
            data,
          },
        )

        if (!emitter) {
          emitter = new IntegrationStreamWorkerEmitter(req.sqs, tracer, req.log)
          await emitter.init()
        }

        await emitter.triggerWebhookProcessing(integration.tenantId, integration.platform, result)

        res.sendStatus(204)
      } else {
        req.log.error({ event, groupName }, 'No integration found for incoming Groups.io Webhook!')
        res.status(200).send({
          message: 'No integration found for incoming Groups.io Webhook!',
        })
      }
    }),
  )
}
