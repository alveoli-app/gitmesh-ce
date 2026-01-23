import Sequelize, { DataTypes } from 'sequelize'
/**
 * This module creates the Sequelize to the database and
 * exports all the models.
 */
import { getServiceChildLogger } from '@gitmesh/logging'
import { DB_CONFIG, SERVICE } from '../../conf'
import * as configTypes from '../../conf/configTypes'
import { registerSignalsCacheHooks } from '../hooks/signalsCacheHooks'

const { highlight } = require('cli-highlight')

const log = getServiceChildLogger('Database')

interface Credentials {
  username: string
  password: string
}

function getCredentials(): Credentials {
  if (DB_CONFIG.username) {
    return {
      username: DB_CONFIG.username,
      password: DB_CONFIG.password,
    }
  }

  switch (SERVICE) {
    case configTypes.ServiceType.API:
      return {
        username: DB_CONFIG.apiUsername,
        password: DB_CONFIG.apiPassword,
      }
    case configTypes.ServiceType.JOB_GENERATOR:
      return {
        username: DB_CONFIG.jobGeneratorUsername,
        password: DB_CONFIG.jobGeneratorPassword,
      }
    case configTypes.ServiceType.NODEJS_WORKER:
      return {
        username: DB_CONFIG.nodejsWorkerUsername,
        password: DB_CONFIG.nodejsWorkerPassword,
      }
    default:
      throw new Error('Incorrectly configured database connection settings!')
  }
}

function models(queryTimeoutMilliseconds: number) {
  const database = {} as any

  const credentials = getCredentials()

  const sequelize = new (<any>Sequelize)(
    DB_CONFIG.database,
    credentials.username,
    credentials.password,
    {
      dialect: DB_CONFIG.dialect,
      dialectOptions: {
        application_name: SERVICE,
        connectionTimeoutMillis: 5000,
        query_timeout: queryTimeoutMilliseconds,
        idle_in_transaction_session_timeout: 10000,
      },
      port: DB_CONFIG.port,
      replication: {
        read: [
          {
            host:
              SERVICE === configTypes.ServiceType.API ? DB_CONFIG.readHost : DB_CONFIG.writeHost,
          },
        ],
        write: { host: DB_CONFIG.writeHost },
      },
      pool: {
        max: SERVICE === configTypes.ServiceType.API ? 20 : 10,
        min: 0,
        acquire: 50000,
        idle: 10000,
      },
      logging: DB_CONFIG.logging
        ? (dbLog) =>
          log.info(
            highlight(dbLog, {
              language: 'sql',
              ignoreIllegals: true,
            }),
            'DB LOG',
          )
        : false,
    },
  )

  const modelClasses = [
    require('./activity').default,
    require('./auditLog').default,
    require('./member').default,
    require('./memberIdentity').default,
    require('./file').default,
    require('./integration').default,
    require('./report').default,
    require('./settings').default,
    require('./tag').default,
    require('./tenant').default,
    require('./tenantUser').default,
    require('./user').default,
    require('./widget').default,
    require('./microservice').default,
    require('./conversation').default,
    require('./conversationSettings').default,
    require('./signalsContent').default,
    require('./signalsAction').default,
    require('./automation').default,
    require('./automationExecution').default,
    require('./organization').default,
    require('./organizationCache').default,
    require('./memberAttributeSettings').default,
    require('./task').default,
    require('./note').default,
    require('./memberActivityAggregatesMV').default,
    require('./segment').default,
    require('./customView').default,
    require('./customViewOrder').default,
  ]

  for (const notInitmodel of modelClasses) {
    const model = notInitmodel(sequelize, DataTypes)
    database[model.name] = model
  }

  // Load DevTel models
  const devtelModels = require('./devtel').default(sequelize)
  Object.keys(devtelModels).forEach((modelName) => {
    database[modelName] = devtelModels[modelName]
  })

  // Load Chat models
  const chatModels = require('./chat').default(sequelize)
  Object.keys(chatModels).forEach((modelName) => {
    database[modelName] = chatModels[modelName]
  })

  Object.keys(database).forEach((modelName) => {
    if (database[modelName].associate) {
      database[modelName].associate(database)
    }
  })

  // Register signals cache hooks for activity model
  if (database.activity) {
    try {
      const options = {
        log,
        redis: null, // Will be set when Redis is available
        config: null, // Will be set when config is available
      }
      
      // Note: Cache hooks will be registered when Redis connection is available
      // This is handled in the middleware setup
      log.debug('Activity model ready for signals cache hooks')
    } catch (error) {
      log.warn('Failed to register signals cache hooks', { error: error.message })
    }
  }

  database.sequelize = sequelize
  database.Sequelize = Sequelize

  return database
}

export default models
