import {
  IntegrationRunWorkerEmitter,
  IntegrationStreamWorkerEmitter,
  IntegrationSyncWorkerEmitter,
  SearchSyncWorkerEmitter,
  DataSinkWorkerEmitter,
  SqsClient,
  getSqsClient,
} from '@gitmesh/sqs'
import { getServiceChildLogger } from '@gitmesh/logging'
import { getServiceTracer } from '@gitmesh/tracing'
import { SQS_CONFIG } from '../../conf'

const tracer = getServiceTracer()
const log = getServiceChildLogger('service.sqs')

let sqsClient: SqsClient
export const SQS_CLIENT = (): SqsClient => {
  if (sqsClient) return sqsClient

  const config = SQS_CONFIG
  sqsClient = getSqsClient({
    region: config.aws.region,
    host: config.host,
    port: config.port,
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  })
  return sqsClient
}

let runWorkerEmitter: IntegrationRunWorkerEmitter
export const getIntegrationRunWorkerEmitter = async (): Promise<IntegrationRunWorkerEmitter> => {
  if (runWorkerEmitter) return runWorkerEmitter

  if (!SQS_CONFIG.host && (!SQS_CONFIG.aws || !SQS_CONFIG.aws.region)) {
    log.warn('SQS not configured, using mock IntegrationRunWorkerEmitter')
    return {
      triggerIntegrationRun: async () => {
        log.warn('Mock IntegrationRunWorkerEmitter.triggerIntegrationRun called')
      },
      init: async () => {},
    } as unknown as IntegrationRunWorkerEmitter
  }

  runWorkerEmitter = new IntegrationRunWorkerEmitter(SQS_CLIENT(), tracer, log)
  await runWorkerEmitter.init()
  return runWorkerEmitter
}

let streamWorkerEmitter: IntegrationStreamWorkerEmitter
export const getIntegrationStreamWorkerEmitter =
  async (): Promise<IntegrationStreamWorkerEmitter> => {
    if (streamWorkerEmitter) return streamWorkerEmitter

    if (!SQS_CONFIG.host && (!SQS_CONFIG.aws || !SQS_CONFIG.aws.region)) {
      log.warn('SQS not configured, using mock IntegrationStreamWorkerEmitter')
      return {
        triggerWebhookProcessing: async () => {
          log.warn('Mock IntegrationStreamWorkerEmitter.triggerWebhookProcessing called')
        },
        init: async () => {},
      } as unknown as IntegrationStreamWorkerEmitter
    }

    streamWorkerEmitter = new IntegrationStreamWorkerEmitter(SQS_CLIENT(), tracer, log)
    await streamWorkerEmitter.init()
    return streamWorkerEmitter
  }

let searchSyncWorkerEmitter: SearchSyncWorkerEmitter
export const getSearchSyncWorkerEmitter = async (): Promise<SearchSyncWorkerEmitter> => {
  if (searchSyncWorkerEmitter) return searchSyncWorkerEmitter

  if (!SQS_CONFIG.host && (!SQS_CONFIG.aws || !SQS_CONFIG.aws.region)) {
    log.warn('SQS not configured, using mock SearchSyncWorkerEmitter')
    return {
      triggerSync: async () => {
        log.warn('Mock SearchSyncWorkerEmitter.triggerSync called')
      },
      init: async () => {},
    } as unknown as SearchSyncWorkerEmitter
  }

  searchSyncWorkerEmitter = new SearchSyncWorkerEmitter(SQS_CLIENT(), tracer, log)
  await searchSyncWorkerEmitter.init()
  return searchSyncWorkerEmitter
}

let integrationSyncWorkerEmitter: IntegrationSyncWorkerEmitter
export const getIntegrationSyncWorkerEmitter = async (): Promise<IntegrationSyncWorkerEmitter> => {
  if (integrationSyncWorkerEmitter) return integrationSyncWorkerEmitter

  if (!SQS_CONFIG.host && (!SQS_CONFIG.aws || !SQS_CONFIG.aws.region)) {
    log.warn('SQS not configured, using mock IntegrationSyncWorkerEmitter')
    return {
      triggerOnboardAutomation: async () => {
        log.warn('Mock IntegrationSyncWorkerEmitter.triggerOnboardAutomation called')
      },
      init: async () => {},
    } as unknown as IntegrationSyncWorkerEmitter
  }

  integrationSyncWorkerEmitter = new IntegrationSyncWorkerEmitter(SQS_CLIENT(), tracer, log)
  await integrationSyncWorkerEmitter.init()
  return integrationSyncWorkerEmitter
}

let dataSinkWorkerEmitter: DataSinkWorkerEmitter
export const getDataSinkWorkerEmitter = async (): Promise<DataSinkWorkerEmitter> => {
  if (dataSinkWorkerEmitter) return dataSinkWorkerEmitter

  if (!SQS_CONFIG.host && (!SQS_CONFIG.aws || !SQS_CONFIG.aws.region)) {
    log.warn('SQS not configured, using mock DataSinkWorkerEmitter')
    return {
      triggerDataSink: async () => {
        log.warn('Mock DataSinkWorkerEmitter.triggerDataSink called')
      },
      init: async () => {},
    } as unknown as DataSinkWorkerEmitter
  }

  dataSinkWorkerEmitter = new DataSinkWorkerEmitter(SQS_CLIENT(), tracer, log)
  await dataSinkWorkerEmitter.init()
  return dataSinkWorkerEmitter
}
