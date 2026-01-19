import * as brevo from '@getbrevo/brevo'

import { Config } from '@gitmesh/archetype-standard'
import { ServiceWorker, Options } from '@gitmesh/archetype-worker'

import { scheduleEmailSignalsDigest, scheduleEmailAnalyticsWeekly } from './schedules'

const config: Config = {
  envvars: [
    'API_FRONTEND_URL',
    'SIGNALS_URL',
    'SIGNALS_API_KEY',
    'CUBEJS_URL',
    'CUBEJS_JWT_SECRET',
    'CUBEJS_JWT_EXPIRY',
    'BREVO_API_KEY',
    'BREVO_TEMPLATE_SIGNALS_DIGEST',
    'BREVO_TEMPLATE_WEEKLY_ANALYTICS',
    'BREVO_NAME_FROM',
    'BREVO_EMAIL_FROM',
  ],
  producer: {
    enabled: false,
  },
  temporal: {
    enabled: true,
  },
  redis: {
    enabled: false,
  },
}

const options: Options = {
  postgres: {
    enabled: true,
  },
}

export const svc = new ServiceWorker(config, options)

setImmediate(async () => {
  await svc.init()

  // Brevo API is initialized per request, no global setup needed

  await scheduleEmailSignalsDigest()
  await scheduleEmailAnalyticsWeekly()

  await svc.start()
})
