/**
 * Connection pool monitor implementation for tracking connection pool health,
 * performance metrics, and lifecycle events
 */

import { Pool, PoolClient } from 'pg'
import { EventEmitter } from 'events'
import { ConnectionPoolMonitor } from './interfaces'
import {
  ConnectionPoolMetrics,
  ConnectionPoolHealth,
  ConnectionLifecycleEvent,
  ConnectionPoolIssue
} from './types'
import { Logger } from '@gitmesh/logging'

export class ConnectionPoolMonitorImpl extends EventEmitter implements ConnectionPoolMonitor {
  private readonly logger: Logger
  private readonly pool: Pool
  private isMonitoring: boolean = false
  private metricsInterval?: NodeJS.Timeout
  private lifecycleEvents: ConnectionLifecycleEvent[] = []
  private connectionStartTimes: Map<string, number> = new Map()
  private queryStartTimes: Map<string, number> = new Map()
  private connectionCounter: number = 0

  // Configuration
  private readonly metricsIntervalMs: number = 30000 // 30 seconds
  private readonly maxLifecycleEvents: number = 1000
  private readonly slowQueryThresholdMs: number = 5000 // 5 seconds
  private readonly highUtilizationThreshold: number = 0.8 // 80%

  constructor(pool: Pool, logger: Logger) {
    super()
    this.pool = pool
    this.logger = logger
    this.setupPoolEventListeners()
  }

  /**
   * Gets current connection pool metrics
   */
  async getPoolMetrics(): Promise<ConnectionPoolMetrics> {
    const timestamp = new Date()
    
    // Get pool statistics
    const totalConnections = this.pool.totalCount
    const idleConnections = this.pool.idleCount
    const waitingConnections = this.pool.waitingCount
    const activeConnections = totalConnections - idleConnections
    const maxConnections = this.pool.options.max || 10

    // Calculate metrics from recent events
    const recentEvents = this.getRecentLifecycleEvents(300000) // Last 5 minutes
    const connectionErrors = recentEvents.filter(e => e.eventType === 'connection_error').length
    const slowQueries = recentEvents.filter(e => 
      e.eventType === 'connection_released' && 
      e.duration && e.duration > this.slowQueryThresholdMs
    ).length

    // Calculate average times
    const connectionTimes = recentEvents
      .filter(e => e.eventType === 'connection_acquired' && e.duration)
      .map(e => e.duration!)
    const averageConnectionTime = connectionTimes.length > 0 
      ? connectionTimes.reduce((a, b) => a + b, 0) / connectionTimes.length 
      : 0

    const queryTimes = recentEvents
      .filter(e => e.eventType === 'connection_released' && e.duration)
      .map(e => e.duration!)
    const averageQueryTime = queryTimes.length > 0 
      ? queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length 
      : 0

    const poolUtilization = maxConnections > 0 ? totalConnections / maxConnections : 0

    const metrics: ConnectionPoolMetrics = {
      timestamp,
      totalConnections,
      activeConnections,
      idleConnections,
      waitingConnections,
      maxConnections,
      connectionErrors,
      averageConnectionTime,
      averageQueryTime,
      slowQueries,
      poolUtilization
    }

    this.logger.debug('Connection pool metrics collected', metrics)
    return metrics
  }

  /**
   * Gets connection pool health status
   */
  async getPoolHealth(): Promise<ConnectionPoolHealth> {
    const metrics = await this.getPoolMetrics()
    const issues = await this.detectPoolIssues(metrics)
    const recommendations = this.generateHealthRecommendations(issues, metrics)
    const status = this.determineHealthStatus(issues, metrics)

    const health: ConnectionPoolHealth = {
      timestamp: new Date(),
      status,
      metrics,
      issues,
      recommendations
    }

    this.logger.info('Connection pool health assessed', {
      status,
      issueCount: issues.length,
      utilization: metrics.poolUtilization
    })

    return health
  }

  /**
   * Starts monitoring connection lifecycle events
   */
  startLifecycleMonitoring(callback: (event: ConnectionLifecycleEvent) => void): void {
    if (this.isMonitoring) {
      this.logger.warn('Connection pool monitoring is already active')
      return
    }

    this.isMonitoring = true
    this.logger.info('Starting connection pool lifecycle monitoring')

    // Set up event listener
    this.on('lifecycle_event', callback)

    // Start periodic metrics collection
    this.metricsInterval = setInterval(async () => {
      try {
        const metrics = await this.getPoolMetrics()
        this.emit('metrics_collected', metrics)
      } catch (error) {
        this.logger.error('Failed to collect pool metrics', { error: error.message })
      }
    }, this.metricsIntervalMs)
  }

  /**
   * Stops monitoring connection lifecycle events
   */
  stopLifecycleMonitoring(): void {
    if (!this.isMonitoring) {
      this.logger.warn('Connection pool monitoring is not active')
      return
    }

    this.isMonitoring = false
    this.logger.info('Stopping connection pool lifecycle monitoring')

    // Clear interval
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
      this.metricsInterval = undefined
    }

    // Remove all listeners
    this.removeAllListeners()
  }

  /**
   * Optimizes connection pool configuration based on usage patterns
   */
  async optimizePoolConfiguration(): Promise<any> {
    const metrics = await this.getPoolMetrics()
    const recentEvents = this.getRecentLifecycleEvents(3600000) // Last hour
    
    const recommendations: any = {
      timestamp: new Date(),
      currentConfig: {
        max: this.pool.options.max,
        min: this.pool.options.min,
        idleTimeoutMillis: this.pool.options.idleTimeoutMillis,
        connectionTimeoutMillis: this.pool.options.connectionTimeoutMillis
      },
      recommendations: []
    }

    // Analyze utilization patterns
    if (metrics.poolUtilization > 0.9) {
      recommendations.recommendations.push({
        type: 'increase_max_connections',
        current: this.pool.options.max,
        suggested: Math.ceil((this.pool.options.max || 10) * 1.5),
        reason: 'High pool utilization detected'
      })
    }

    if (metrics.poolUtilization < 0.3 && (this.pool.options.max || 10) > 5) {
      recommendations.recommendations.push({
        type: 'decrease_max_connections',
        current: this.pool.options.max,
        suggested: Math.max(5, Math.floor((this.pool.options.max || 10) * 0.7)),
        reason: 'Low pool utilization detected'
      })
    }

    // Analyze connection patterns
    const connectionAcquisitionTimes = recentEvents
      .filter(e => e.eventType === 'connection_acquired' && e.duration)
      .map(e => e.duration!)

    if (connectionAcquisitionTimes.length > 0) {
      const avgAcquisitionTime = connectionAcquisitionTimes.reduce((a, b) => a + b, 0) / connectionAcquisitionTimes.length
      
      if (avgAcquisitionTime > 1000) { // > 1 second
        recommendations.recommendations.push({
          type: 'increase_connection_timeout',
          current: this.pool.options.connectionTimeoutMillis,
          suggested: Math.max(30000, (this.pool.options.connectionTimeoutMillis || 0) * 1.5),
          reason: 'Slow connection acquisition detected'
        })
      }
    }

    // Analyze idle patterns
    if (metrics.idleConnections > metrics.activeConnections * 2) {
      recommendations.recommendations.push({
        type: 'decrease_idle_timeout',
        current: this.pool.options.idleTimeoutMillis,
        suggested: Math.max(10000, (this.pool.options.idleTimeoutMillis || 30000) * 0.7),
        reason: 'Many idle connections detected'
      })
    }

    this.logger.info('Pool configuration optimization completed', {
      recommendationCount: recommendations.recommendations.length
    })

    return recommendations
  }

  /**
   * Generates a comprehensive pool performance report
   */
  async generatePoolReport(): Promise<any> {
    const health = await this.getPoolHealth()
    const optimization = await this.optimizePoolConfiguration()
    const recentEvents = this.getRecentLifecycleEvents(3600000) // Last hour

    const report = {
      timestamp: new Date(),
      summary: {
        status: health.status,
        totalConnections: health.metrics.totalConnections,
        utilization: health.metrics.poolUtilization,
        issueCount: health.issues.length,
        recommendationCount: optimization.recommendations.length
      },
      health,
      optimization,
      eventStatistics: this.calculateEventStatistics(recentEvents),
      performanceMetrics: {
        averageConnectionTime: health.metrics.averageConnectionTime,
        averageQueryTime: health.metrics.averageQueryTime,
        slowQueries: health.metrics.slowQueries,
        connectionErrors: health.metrics.connectionErrors
      }
    }

    this.logger.info('Pool performance report generated', report.summary)
    return report
  }

  /**
   * Sets up event listeners on the pool
   */
  private setupPoolEventListeners(): void {
    // Note: pg Pool doesn't expose all these events directly
    // This is a conceptual implementation - actual implementation would depend on
    // the specific pool implementation and available events

    // Override pool methods to track lifecycle events
    const originalConnect = this.pool.connect.bind(this.pool)
    this.pool.connect = async (...args: any[]) => {
      const connectionId = this.generateConnectionId()
      const startTime = Date.now()
      
      try {
        this.recordLifecycleEvent({
          timestamp: new Date(),
          eventType: 'connection_created',
          connectionId
        })

        const client = await originalConnect(...args)
        const duration = Date.now() - startTime

        this.recordLifecycleEvent({
          timestamp: new Date(),
          eventType: 'connection_acquired',
          connectionId,
          duration
        })

        // Wrap client release to track when connection is returned
        const originalRelease = client.release.bind(client)
        client.release = (err?: Error) => {
          this.recordLifecycleEvent({
            timestamp: new Date(),
            eventType: 'connection_released',
            connectionId,
            error: err?.message
          })
          return originalRelease(err)
        }

        return client
      } catch (error) {
        this.recordLifecycleEvent({
          timestamp: new Date(),
          eventType: 'connection_error',
          connectionId,
          error: error.message
        })
        throw error
      }
    }
  }

  /**
   * Records a lifecycle event
   */
  private recordLifecycleEvent(event: ConnectionLifecycleEvent): void {
    this.lifecycleEvents.push(event)
    
    // Limit the number of stored events
    if (this.lifecycleEvents.length > this.maxLifecycleEvents) {
      this.lifecycleEvents = this.lifecycleEvents.slice(-this.maxLifecycleEvents)
    }

    // Emit event for listeners
    if (this.isMonitoring) {
      this.emit('lifecycle_event', event)
    }
  }

  /**
   * Gets recent lifecycle events within a time window
   */
  private getRecentLifecycleEvents(windowMs: number): ConnectionLifecycleEvent[] {
    const cutoff = new Date(Date.now() - windowMs)
    return this.lifecycleEvents.filter(event => event.timestamp >= cutoff)
  }

  /**
   * Detects issues with the connection pool
   */
  private async detectPoolIssues(metrics: ConnectionPoolMetrics): Promise<ConnectionPoolIssue[]> {
    const issues: ConnectionPoolIssue[] = []

    // High utilization
    if (metrics.poolUtilization > this.highUtilizationThreshold) {
      issues.push({
        type: 'high_utilization',
        severity: metrics.poolUtilization > 0.95 ? 'critical' : 'high',
        description: `Pool utilization is ${(metrics.poolUtilization * 100).toFixed(1)}%`,
        recommendation: 'Consider increasing max connections or optimizing query performance',
        detectedAt: new Date(),
        count: 1
      })
    }

    // Connection errors
    if (metrics.connectionErrors > 0) {
      issues.push({
        type: 'connection_errors',
        severity: metrics.connectionErrors > 5 ? 'high' : 'medium',
        description: `${metrics.connectionErrors} connection errors in recent period`,
        recommendation: 'Check database connectivity and network stability',
        detectedAt: new Date(),
        count: metrics.connectionErrors
      })
    }

    // Slow queries
    if (metrics.slowQueries > 0) {
      issues.push({
        type: 'slow_queries',
        severity: metrics.slowQueries > 10 ? 'high' : 'medium',
        description: `${metrics.slowQueries} slow queries detected`,
        recommendation: 'Optimize query performance or increase query timeout',
        detectedAt: new Date(),
        count: metrics.slowQueries
      })
    }

    // Pool exhaustion
    if (metrics.waitingConnections > 0) {
      issues.push({
        type: 'pool_exhaustion',
        severity: metrics.waitingConnections > 5 ? 'critical' : 'high',
        description: `${metrics.waitingConnections} connections waiting for availability`,
        recommendation: 'Increase max connections or reduce connection hold time',
        detectedAt: new Date(),
        count: metrics.waitingConnections
      })
    }

    // Connection leaks (more active than expected)
    const expectedActive = Math.min(metrics.totalConnections, 5) // Reasonable baseline
    if (metrics.activeConnections > expectedActive * 2) {
      issues.push({
        type: 'connection_leaks',
        severity: 'medium',
        description: `Unusually high number of active connections: ${metrics.activeConnections}`,
        recommendation: 'Check for connection leaks in application code',
        detectedAt: new Date(),
        count: metrics.activeConnections
      })
    }

    return issues
  }

  /**
   * Generates health recommendations based on issues and metrics
   */
  private generateHealthRecommendations(issues: ConnectionPoolIssue[], metrics: ConnectionPoolMetrics): string[] {
    const recommendations: string[] = []

    if (issues.length === 0) {
      recommendations.push('Connection pool is operating normally')
      return recommendations
    }

    // Add issue-specific recommendations
    for (const issue of issues) {
      recommendations.push(issue.recommendation)
    }

    // Add general recommendations based on metrics
    if (metrics.averageConnectionTime > 1000) {
      recommendations.push('Consider optimizing database connection setup or network latency')
    }

    if (metrics.averageQueryTime > 2000) {
      recommendations.push('Review and optimize slow-running queries')
    }

    return [...new Set(recommendations)] // Remove duplicates
  }

  /**
   * Determines overall health status
   */
  private determineHealthStatus(issues: ConnectionPoolIssue[], metrics: ConnectionPoolMetrics): ConnectionPoolHealth['status'] {
    if (issues.some(i => i.severity === 'critical')) {
      return 'critical'
    }

    if (issues.some(i => i.severity === 'high') || metrics.poolUtilization > 0.9) {
      return 'degraded'
    }

    return 'healthy'
  }

  /**
   * Calculates statistics from lifecycle events
   */
  private calculateEventStatistics(events: ConnectionLifecycleEvent[]): any {
    const eventCounts = events.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const durations = events
      .filter(e => e.duration !== undefined)
      .map(e => e.duration!)

    const avgDuration = durations.length > 0 
      ? durations.reduce((a, b) => a + b, 0) / durations.length 
      : 0

    const maxDuration = durations.length > 0 ? Math.max(...durations) : 0
    const minDuration = durations.length > 0 ? Math.min(...durations) : 0

    return {
      totalEvents: events.length,
      eventCounts,
      durationStats: {
        average: avgDuration,
        max: maxDuration,
        min: minDuration,
        count: durations.length
      }
    }
  }

  /**
   * Generates a unique connection ID
   */
  private generateConnectionId(): string {
    return `conn_${++this.connectionCounter}_${Date.now()}`
  }
}