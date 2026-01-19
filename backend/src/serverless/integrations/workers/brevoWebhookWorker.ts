import { getServiceChildLogger } from '@gitmesh/logging'
import * as crypto from 'crypto'
import { PlatformType } from '@gitmesh/types'
import { IS_PROD_ENV, BREVO_CONFIG } from '../../../conf'
import SequelizeRepository from '../../../database/repositories/sequelizeRepository'
import UserRepository from '../../../database/repositories/userRepository'
import getUserContext from '../../../database/utils/getUserContext'
import SignalsContentService from '../../../services/signalsContentService'
import { NodeWorkerMessageBase } from '../../../types/mq/nodeWorkerMessageBase'
import { BrevoWebhookEvent, BrevoWebhookEventType } from '../../../types/webhooks'
import { NodeWorkerMessageType } from '../../types/workerTypes'
import { sendNodeWorkerMessage } from '../../utils/nodeWorkerSQS'

const log = getServiceChildLogger('brevoWebhookWorker')

export default async function brevoWebhookWorker(req) {
  if (!BREVO_CONFIG.webhookSecret) {
    log.error('Brevo webhook secret is not found.')
    return {
      status: 400,
    }
  }

  if (!IS_PROD_ENV) {
    log.warn('Brevo events will be only sent for production.')
    return {
      status: 200,
    }
  }

  const events = req.body as BrevoWebhookEvent[]

  // Verify Brevo webhook signature using HMAC-SHA256
  const signature = req.headers['x-brevo-signature']
  if (!signature) {
    log.error('Brevo webhook signature header missing.')
    return {
      status: 400,
    }
  }

  const expectedSignature = crypto
    .createHmac('sha256', BREVO_CONFIG.webhookSecret)
    .update(req.rawBody)
    .digest('hex')

  if (signature !== expectedSignature) {
    log.error('Brevo webhook signature verification failed.')
    return {
      status: 400,
    }
  }

  for (const event of events) {
    // Check if this is a signals digest email based on template ID or tags
    const isSignalsDigest = event.templateId === parseInt(BREVO_CONFIG.templateSignalsDigest, 10) ||
                           (event.tags && event.tags.includes('signals-digest'))
    
    if (isSignalsDigest) {
      await sendNodeWorkerMessage(event.messageId || event.uuid, {
        type: NodeWorkerMessageType.NODE_MICROSERVICE,
        event,
        service: 'brevo-webhooks',
      } as NodeWorkerMessageBase)
    }
  }

  return {
    status: 200,
  }
}

const findPlatform = (str: string, arr: string[]): string => {
  const match = arr.find((item) => str.includes(item))
  return match || null
}

export const processBrevoWebhook = async (message: any) => {
  log.info({ message }, 'Got event from brevo webhook!')
  log.warn(message)
  const options = await SequelizeRepository.getDefaultIRepositoryOptions()
  const brevoEvent = message.event as BrevoWebhookEvent

  const user = await UserRepository.findByEmail(brevoEvent.email, options)

  // Extract tenant ID from tags if available
  const tenantTag = brevoEvent.tags?.find(tag => tag.startsWith('tenant:'))
  const tenantId = tenantTag ? tenantTag.split(':')[1] : null

  const userContext = await getUserContext(tenantId, user.id)

  switch (brevoEvent.event) {
    case BrevoWebhookEventType.OPENED: {
      SignalsContentService.trackDigestEmailOpened(userContext)
      break
    }
    case BrevoWebhookEventType.CLICK: {
      const platform = findPlatform(
        new URL(brevoEvent.link).hostname,
        Object.values(PlatformType),
      )
      SignalsContentService.trackPostClicked(brevoEvent.link, platform, userContext, 'email')
      break
    }
    default:
      log.info({ event: message.event }, 'Unsupported event')
  }
}
