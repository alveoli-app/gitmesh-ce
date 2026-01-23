import { SERVICE } from '@gitmesh/common'
import { getUnleashClient } from '@gitmesh/feature-flags'
import { getServiceLogger } from '@gitmesh/logging'
import { getOpensearchClient } from '@gitmesh/opensearch'
import { getRedisClient, getRedisPubSubPair, RedisPubSubReceiver } from '@gitmesh/redis'
import { getServiceTracer } from '@gitmesh/tracing'
import { ApiWebsocketMessage, Edition } from '@gitmesh/types'
import bodyParser from 'body-parser'
import bunyanMiddleware from 'bunyan-middleware'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import * as http from 'http'
import { getTemporalClient, Client as TemporalClient } from '@gitmesh/temporal'
import { QueryTypes, Sequelize } from 'sequelize'
import {
  API_CONFIG,
  OPENSEARCH_CONFIG,
  REDIS_CONFIG,
  TEMPORAL_CONFIG,
  UNLEASH_CONFIG,
} from '../conf'
import { authMiddleware } from '../middlewares/authMiddleware'
import { databaseMiddleware } from '../middlewares/databaseMiddleware'
import { errorMiddleware } from '../middlewares/errorMiddleware'
import { languageMiddleware } from '../middlewares/languageMiddleware'
import { opensearchMiddleware } from '../middlewares/opensearchMiddleware'
import { passportStrategyMiddleware } from '../middlewares/passportStrategyMiddleware'
import { redisMiddleware } from '../middlewares/redisMiddleware'
import { responseHandlerMiddleware } from '../middlewares/responseHandlerMiddleware'
import { segmentMiddleware } from '../middlewares/segmentMiddleware'
import { tenantMiddleware } from '../middlewares/tenantMiddleware'
import setupSwaggerUI from './apiDocumentation'
import { createRateLimiter } from './apiRateLimiter'
import authSocial from './auth/authSocial'
import WebSockets from './websockets'
import DevtelWebSocketNamespace from './websockets/devtel'
import { databaseInit } from '@/database/databaseConnection'
import { initChatSocket, setChatSocket } from '../websocket/chatSocket'

// Declare global for DevTel WebSocket namespace
declare global {
  var devtelWebSocket: ReturnType<typeof initChatSocket>
}

const serviceLogger = getServiceLogger()
getServiceTracer()

const app = express()

const server = http.createServer(app)

setImmediate(async () => {
  const redis = await getRedisClient(REDIS_CONFIG, true)

  const opensearch = getOpensearchClient(OPENSEARCH_CONFIG)

  const redisPubSubPair = await getRedisPubSubPair(REDIS_CONFIG)
  const { userNamespace, devtel: devtelNamespace, socketIo } = await WebSockets.initialize(server)

  // Initialize chat websocket
  const chatSocketInstance = initChatSocket(socketIo)
  setChatSocket(chatSocketInstance)

  // Store chat socket globally for service access
  global.devtelWebSocket = chatSocketInstance

  // Fix stuck integrations on startup - only mark as error if truly stuck
  try {
    const { sequelize } = await databaseInit()
    
    // Only mark integrations as stuck if:
    // 1. They have no active runs (PENDING, PROCESSING, DELAYED)
    // 2. Their last run is in a final state (PROCESSED, ERROR)
    // 3. They've been in this state for over 1 hour
    const stuckIntegrations = await sequelize.query(
      `UPDATE integrations i
       SET status = CASE 
         WHEN EXISTS (
           SELECT 1 FROM "integrationRuns" ir 
           WHERE ir."integrationId" = i.id 
           AND ir.state = 'processed'
           ORDER BY ir."createdAt" DESC 
           LIMIT 1
         ) THEN 'done'
         ELSE 'error'
       END,
       "updatedAt" = NOW()
       WHERE i.status IN ('mapping', 'in-progress', 'processing')
       AND i."updatedAt" < NOW() - INTERVAL '1 hour'
       AND i."deletedAt" IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM "integrationRuns" ir2
         WHERE ir2."integrationId" = i.id
         AND ir2.state IN ('pending', 'processing', 'delayed')
       )
       RETURNING id, platform, status`,
      { type: QueryTypes.UPDATE }
    )
    
    if (stuckIntegrations && stuckIntegrations[0] && stuckIntegrations[0].length > 0) {
      serviceLogger.info({ count: stuckIntegrations[0].length, integrations: stuckIntegrations[0] }, 'Fixed stuck integrations on startup')
    }
  } catch (err) {
    serviceLogger.warn(err, 'Failed to fix stuck integrations on startup')
  }

  const pubSubReceiver = new RedisPubSubReceiver(
    'api-pubsub',
    redisPubSubPair.subClient,
    (err) => {
      serviceLogger.error(err, 'Error while listening to Redis Pub/Sub api-ws channel!')
      process.exit(1)
    },
    serviceLogger,
  )

  pubSubReceiver.subscribe('user', async (message) => {
    const data = message as ApiWebsocketMessage

    if (data.tenantId) {
      await userNamespace.emitForTenant(data.tenantId, data.event, data.data)
    } else if (data.userId) {
      userNamespace.emitToUserRoom(data.userId, data.event, data.data)
    } else {
      serviceLogger.error({ type: data.type }, 'Received invalid websocket message!')
    }
  })

  // Enables CORS
  app.use(cors({ origin: true }))

  // Logging middleware
  app.use(
    bunyanMiddleware({
      headerName: 'x-request-id',
      propertyName: 'requestId',
      logName: `requestId`,
      logger: serviceLogger,
      level: 'trace',
    }),
  )

  // Initializes and adds the database middleware.
  app.use(databaseMiddleware)

  // Bind redis to request
  app.use(redisMiddleware(redis))

  // bind opensearch
  app.use(opensearchMiddleware(opensearch))

  // Bind unleash to request
  if (UNLEASH_CONFIG.url && API_CONFIG.edition === Edition.HOSTED) {
    const unleash = await getUnleashClient({
      url: UNLEASH_CONFIG.url,
      apiKey: UNLEASH_CONFIG.backendApiKey,
      appName: SERVICE,
    })

    app.use((req: any, res, next) => {
      req.unleash = unleash
      next()
    })
  }

  // temp check for production
  if (TEMPORAL_CONFIG.serverUrl) {
    // Bind temporal to request
    const temporal = await getTemporalClient(TEMPORAL_CONFIG)
    app.use((req: any, res, next) => {
      req.temporal = temporal
      next()
    })
  }

  // initialize passport strategies
  app.use(passportStrategyMiddleware)

  // Sets the current language of the request
  app.use(languageMiddleware)

  // adds our ApiResponseHandler instance to the req object as responseHandler
  app.use(responseHandlerMiddleware)

  // Configures the authentication middleware
  // to set the currentUser to the requests
  app.use(authMiddleware)

  // Setup the Documentation
  setupSwaggerUI(app)

  // Default rate limiter
  const defaultRateLimiter = createRateLimiter({
    max: 200,
    windowMs: 60 * 1000,
    message: 'errors.429',
  })
  app.use(defaultRateLimiter)

  // Enables Helmet, a set of tools to
  // increase security.
  app.use(helmet())

  app.use(
    bodyParser.json({
      limit: '5mb',
      verify(req, res, buf) {
        const url = (<any>req).originalUrl
        if (url.startsWith('/webhooks/stripe') || url.startsWith('/webhooks/brevo')) {
          // Stripe and Brevo webhooks needs the body raw
          // for verifying the webhook with signing secret
          ; (<any>req).rawBody = buf.toString()
        }
      },
    }),
  )

  app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }))

  // Configure the Entity routes
  const routes = express.Router()

  // Enable Passport for Social Sign-in
  authSocial(app, routes)

  // Load API modules safely. Some optional modules (e.g. cubejs) may throw
  // during require in dev when their dependencies or globals are not ready.
  // We don't want one failing module to prevent the whole API from starting
  // and mounting already-registered routes (for example social auth routes).
  const apiModules = [
    './auditLog',
    './auth',
    './plan',
    './tenant',
    './user',
    './settings',
    './member',
    './widget',
    './activity',
    './tag',
    './widget',
    './cubejs',
    './report',
    './integration',
    './microservice',
    './conversation',
    './signalsContent',
    './signals',
    './automation',
    './task',
    './note',
    './organization',
    './quickstart-guide',
    './slack',
    './segment',
    './eventTracking',
    './customViews',
    './metrics',
    './premium/enrichment',
    './devtel',
    './premium/chat',
    './premium/agent-bridge',
  ]

  console.log('[API] ===========>  About to load', apiModules.length, 'API modules')

  for (const mod of apiModules) {
    try {
      if (mod === './devtel') {
        console.log('[DEBUG] About to require devtel module')
      }
      // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
      const loader = require(mod)
      if (mod === './devtel') {
        console.log('[DEBUG] Devtel module required successfully, loader:', typeof loader, 'default:', typeof loader?.default)
      }
      if (loader && typeof loader.default === 'function') {
        if (mod === './devtel') {
          console.log('[DEBUG] About to call devtel loader function')
        }
        try {
          loader.default(routes)
          if (mod === './devtel') {
            console.log('[DEBUG] DevTel loader function completed successfully')
          }
        } catch (execErr) {
          console.log(`\n=== Module Execution Error for ${mod} ===`)
          console.log('Execution error object:', execErr)
          console.log('Execution error message:', execErr?.message)
          console.log('Execution error stack:', execErr?.stack)
          console.log('============================================\n')
          throw execErr
        }
      } else if (typeof loader === 'function') {
        loader(routes)
      } else {
        console.log(`Module ${mod} loaded but no function found. loader:`, loader, 'typeof default:', typeof loader?.default)
      }
    } catch (err) {
      console.log(`\n=== Module Load Error for ${mod} ===`)
      console.log('Error object:', err)
      console.log('Error message:', err?.message)
      console.log('Error stack:', err?.stack)
      console.log('Error name:', err?.name)
      console.log('Error constructor:', err?.constructor?.name)
      console.log('===================================\n')
      serviceLogger.error(
        { 
          err, 
          module: mod, 
          errorMessage: err?.message, 
          errorStack: err?.stack,
          errorName: err?.name 
        }, 
        `Failed to load API module ${mod}. Continuing without it.`
      )
    }
  }
  // Loads the Tenant if the :tenantId param is passed
  routes.param('tenantId', tenantMiddleware)
  routes.param('tenantId', segmentMiddleware)

  app.use('/', routes)

  const webhookRoutes = express.Router()
  require('./webhooks').default(webhookRoutes)

  const seq = (await databaseInit()).sequelize as Sequelize

  app.use('/health', async (req: any, res) => {
    try {
      const [osPingRes, redisPingRes, dbPingRes, temporalPingRes] = await Promise.all([
        // ping opensearch
        opensearch.ping().then((res) => res.body),
        // ping redis,
        redis.ping().then((res) => res === 'PONG'),
        // ping database
        seq.query('select 1', { type: QueryTypes.SELECT }).then((rows) => rows.length === 1),
        // ping temporal
        req.temporal
          ? (req.temporal as TemporalClient).workflowService.getSystemInfo({}).then(() => true)
          : Promise.resolve(true),
      ])

      if (osPingRes && redisPingRes && dbPingRes && temporalPingRes) {
        res.sendStatus(200)
      } else {
        res.status(500).json({
          opensearch: osPingRes,
          redis: redisPingRes,
          database: dbPingRes,
          temporal: temporalPingRes,
        })
      }
    } catch (err) {
      res.status(500).json({ error: err })
    }
  })

  app.use('/webhooks', webhookRoutes)

  const io = require('@pm2/io')

  app.use(errorMiddleware)

  app.use(io.expressErrorHandler())
})

export default server
