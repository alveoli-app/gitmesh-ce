// Jest setup file for signal enrichment worker tests

// Mock Temporal dependencies
jest.mock('@gitmesh/temporal', () => ({
  getTemporalClient: jest.fn(() => ({
    workflow: {
      start: jest.fn(),
      getHandle: jest.fn(() => ({
        describe: jest.fn(() => ({
          workflowExecutionInfo: {
            execution: {
              workflowId: 'test-workflow-id',
              runId: 'test-run-id',
            },
            status: 'RUNNING',
            startTime: new Date(),
            closeTime: null,
            executionTime: 1000,
          },
        })),
      })),
    },
    schedule: {
      create: jest.fn(() => ({
        scheduleId: 'test-schedule-id',
        delete: jest.fn(),
      })),
      getHandle: jest.fn(() => ({
        delete: jest.fn(),
      })),
    },
  })),
}))

jest.mock('@temporalio/worker', () => ({
  NativeConnection: {
    connect: jest.fn(() => ({
      close: jest.fn(),
    })),
  },
  Worker: {
    create: jest.fn(() => ({
      run: jest.fn(),
      shutdown: jest.fn(),
    })),
  },
}))

jest.mock('@temporalio/workflow', () => ({
  proxyActivities: jest.fn((config) => ({
    enrichBatch: jest.fn(),
    getBatchMetrics: jest.fn(),
  })),
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

// Mock external dependencies that require actual connections
jest.mock('@gitmesh/database', () => ({
  getDatabaseConnection: jest.fn(() => ({
    query: jest.fn(),
    QueryTypes: {
      SELECT: 'SELECT',
      UPDATE: 'UPDATE',
    },
  })),
}))

jest.mock('@gitmesh/opensearch', () => ({
  getOpensearchClient: jest.fn(() => ({
    indices: {
      exists: jest.fn(),
      create: jest.fn(),
      stats: jest.fn(),
    },
    index: jest.fn(),
    bulk: jest.fn(),
    search: jest.fn(),
    delete: jest.fn(),
    scroll: jest.fn(),
    clearScroll: jest.fn(),
  })),
}))

jest.mock('@gitmesh/redis', () => ({
  getRedisClient: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  })),
}))

jest.mock('@gitmesh/sqs', () => ({
  SqsClient: jest.fn(() => ({
    sendMessage: jest.fn(),
    receiveMessage: jest.fn(),
  })),
}))

// Mock configuration
jest.mock('../conf', () => ({
  default: {
    identityResolution: {
      fuzzyMatchingThreshold: 0.85,
      enableFuzzyMatching: true,
    },
    batchProcessing: {
      batchSize: 1000,
      processingInterval: 900000,
    },
    retry: {
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelay: 1000,
    },
    opensearch: {
      indexPrefix: 'gitmesh-signals',
      vectorAlgorithm: 'hnsw',
      vectorParams: {
        m: 16,
        efConstruction: 100,
      },
      clustering: {
        minClusterSize: 5,
        outlierClusterId: -1,
      },
    },
    temporal: {
      workflowId: 'signal-enrichment-workflow',
      taskQueue: 'signal-enrichment-queue',
      cronSchedule: '*/15 * * * *',
      workflowTimeout: '10m',
    },
  },
  OPENSEARCH_CONFIG: jest.fn(() => ({
    node: 'http://localhost:9200',
  })),
  REDIS_CONFIG: jest.fn(() => ({
    host: 'localhost',
    port: 6379,
  })),
  DB_CONFIG: jest.fn(() => ({
    host: 'localhost',
    port: 5432,
    database: 'test',
  })),
  SQS_CONFIG: jest.fn(() => ({
    region: 'us-east-1',
  })),
  TEMPORAL_CONFIG: jest.fn(() => ({
    serverUrl: 'localhost:7233',
    namespace: 'default',
    certificate: null,
    privateKey: null,
  })),
}))

// Set test timeout
jest.setTimeout(30000)