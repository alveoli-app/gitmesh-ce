import { LoggerBase } from '@gitmesh/logging'
import SignalsCacheInvalidationService from '../../services/signalsCacheInvalidationService'
import { IServiceOptions } from '../../services/IServiceOptions'

/**
 * Database hooks for automatic cache invalidation
 * Integrates with Sequelize model hooks to invalidate cache on activity changes
 */
export class SignalsCacheHooks extends LoggerBase {
  private options: IServiceOptions
  private cacheService: SignalsCacheInvalidationService

  constructor(options: IServiceOptions) {
    super(options.log)
    this.options = options
    this.cacheService = new SignalsCacheInvalidationService(options)
  }

  /**
   * Register hooks with the activity model
   */
  registerHooks(activityModel: any): void {
    // Hook for after activity update
    activityModel.addHook('afterUpdate', 'invalidateSignalsCache', async (instance, options) => {
      try {
        const tenantId = instance.tenantId
        const activityId = instance.id
        
        // Check if signal_metadata was changed
        if (instance.changed('signal_metadata')) {
          await this.cacheService.invalidateForActivity(tenantId, activityId)
          this.log.debug('Cache invalidated after activity update', { tenantId, activityId })
        }
        
        // Check if other relevant fields were changed
        const relevantFields = ['memberId', 'platform', 'type', 'title', 'body', 'timestamp']
        const changedRelevantFields = relevantFields.filter(field => instance.changed(field))
        
        if (changedRelevantFields.length > 0) {
          await this.cacheService.invalidateForActivity(tenantId, activityId)
          this.log.debug('Cache invalidated after relevant field update', { 
            tenantId, 
            activityId, 
            changedFields: changedRelevantFields 
          })
        }
      } catch (error) {
        this.log.error('Failed to invalidate cache after activity update', {
          activityId: instance.id,
          error: error.message
        })
      }
    })

    // Hook for after activity creation
    activityModel.addHook('afterCreate', 'invalidateSignalsCacheOnCreate', async (instance, options) => {
      try {
        const tenantId = instance.tenantId
        
        // Invalidate list and export caches since a new activity was added
        await this.cacheService.invalidateAllForTenant(tenantId)
        this.log.debug('Cache invalidated after activity creation', { tenantId, activityId: instance.id })
      } catch (error) {
        this.log.error('Failed to invalidate cache after activity creation', {
          activityId: instance.id,
          error: error.message
        })
      }
    })

    // Hook for after activity deletion
    activityModel.addHook('afterDestroy', 'invalidateSignalsCacheOnDelete', async (instance, options) => {
      try {
        const tenantId = instance.tenantId
        
        // Invalidate all caches since an activity was deleted
        await this.cacheService.invalidateAllForTenant(tenantId)
        this.log.debug('Cache invalidated after activity deletion', { tenantId, activityId: instance.id })
      } catch (error) {
        this.log.error('Failed to invalidate cache after activity deletion', {
          activityId: instance.id,
          error: error.message
        })
      }
    })

    // Hook for bulk operations
    activityModel.addHook('afterBulkUpdate', 'invalidateSignalsCacheOnBulkUpdate', async (options) => {
      try {
        // For bulk operations, we invalidate all cache for safety
        // In a production system, you might want to be more selective
        if (options.where && options.where.tenantId) {
          await this.cacheService.invalidateAllForTenant(options.where.tenantId)
          this.log.debug('Cache invalidated after bulk activity update', { 
            tenantId: options.where.tenantId 
          })
        }
      } catch (error) {
        this.log.error('Failed to invalidate cache after bulk activity update', {
          error: error.message
        })
      }
    })

    this.log.info('Signals cache hooks registered successfully')
  }

  /**
   * Unregister hooks (useful for testing)
   */
  unregisterHooks(activityModel: any): void {
    activityModel.removeHook('afterUpdate', 'invalidateSignalsCache')
    activityModel.removeHook('afterCreate', 'invalidateSignalsCacheOnCreate')
    activityModel.removeHook('afterDestroy', 'invalidateSignalsCacheOnDelete')
    activityModel.removeHook('afterBulkUpdate', 'invalidateSignalsCacheOnBulkUpdate')
    
    this.log.info('Signals cache hooks unregistered')
  }
}

/**
 * Factory function to create and register cache hooks
 */
export function registerSignalsCacheHooks(activityModel: any, options: IServiceOptions): SignalsCacheHooks {
  const hooks = new SignalsCacheHooks(options)
  hooks.registerHooks(activityModel)
  return hooks
}