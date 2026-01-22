/**
 * Health monitoring system for CubeJS API
 * Provides continuous health checking, query response time monitoring,
 * and performance degradation detection with alerting
 * Requirements: 7.3, 7.4
 */

import moment from 'moment'
import { CubeJsService } from '../service'
import CubeDimensions from '../dimensions'
import CubeMeasures from '../measures'
import { getServiceChildLogger } from '@gitmesh/logging'

export interface HealthCheckResult {
  timestamp: Date
  status: 'healthy' | 'degraded' | 'critical'
  responseTime: number
  errors: string[]
  warnings: string[]
  metrics: {
    avgResponseTime: number
    errorRate: number
    successfulQueries: number
    failedQueries: number
  }
}

export interface PerformanceMetrics {
  responseTime: number
  timestamp: Date
  queryType: string
  success: boolean
  error?: string
}

export interface AlertConfig {
  responseTimeThreshold: number // milliseconds
  errorRateThreshold: number // percentage
  degradationWindowMinutes: number
  alertCallback?: (alert: PerformanceAlert) => void
}

export interface PerformanceAlert {
  type: 'response_time' | 'error_rate' | 'availability'
  severity: 'warning' | 'critical'
  message: string
  timestamp: Date
  metrics: {
    currentValue: number
    threshold: number
    windowMinutes: number
  }
}

export class HealthMonitor {
  private logger = getServiceChildLogger('HealthMonitor')
  private performanceHistory: PerformanceMetrics[] = []
  private alertConfig: AlertConfig
  private monitoringInterval?: NodeJS.Timeout
  private isMonitoring = false

  constructor(
    private cubeService: CubeJsService,
    alertConfig: Partial<AlertConfig> = {}
  ) {
    this.alertConfig = {
      responseTimeThreshold: 5000, // 5 seconds
      errorRateThreshold: 10, // 10%
      degradationWindowMinutes: 15,
      ...alertConfig
    }
  }

  /**
   * Start continuous health monitoring
   */
  startMonitoring(intervalMinutes: number = 5): void {
    if (this.isMonitoring) {
      this.logger.warn('Health monitoring is already running')
      return
    }

    this.isMonitoring = true
    this.logger.info(`Starting health monitoring with ${intervalMinutes} minute intervals`)

    // Run initial health check
    this.runHealthCheck().catch(error => {
      this.logger.error('Initial health check failed', { error: error.message })
    })

    // Schedule periodic health checks
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.runHealthCheck()
      } catch (error) {
        this.logger.error('Scheduled health check failed', { error: error.message })
      }
    }, intervalMinutes * 60 * 1000)
  }

  /**
   * Stop continuous health monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = undefined
    }
    this.isMonitoring = false
    this.logger.info('Health monitoring stopped')
  }

  /**
   * Run comprehensive health check
   */
  async runHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now()
    const errors: string[] = []
    const warnings: string[] = []
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy'

    this.logger.info('Running health check')

    try {
      // Test basic query execution
      await this.testBasicQuery()
      
      // Test dashboard queries
      await this.testDashboardQueries()
      
      // Test query response times
      await this.testQueryResponseTimes()

    } catch (error) {
      errors.push(`Health check failed: ${error.message}`)
      status = 'critical'
    }

    // Analyze performance metrics
    const metrics = this.calculateMetrics()
    
    // Check for performance degradation
    const degradationAlerts = this.checkPerformanceDegradation()
    if (degradationAlerts.length > 0) {
      degradationAlerts.forEach(alert => {
        if (alert.severity === 'critical') {
          status = 'critical'
          errors.push(alert.message)
        } else {
          if (status === 'healthy') status = 'degraded'
          warnings.push(alert.message)
        }
        
        // Trigger alert callback if configured
        if (this.alertConfig.alertCallback) {
          this.alertConfig.alertCallback(alert)
        }
      })
    }

    const responseTime = Date.now() - startTime
    const result: HealthCheckResult = {
      timestamp: new Date(),
      status,
      responseTime,
      errors,
      warnings,
      metrics
    }

    this.logger.info('Health check completed', {
      status,
      responseTime,
      errorCount: errors.length,
      warningCount: warnings.length
    })

    return result
  }

  /**
   * Test basic CubeJS query execution
   */
  private async testBasicQuery(): Promise<void> {
    const startTime = Date.now()
    
    try {
      const query = {
        measures: [CubeMeasures.ORGANIZATION_COUNT],
        limit: 1
      }

      await this.cubeService.load(query)
      
      const responseTime = Date.now() - startTime
      this.recordPerformanceMetric({
        responseTime,
        timestamp: new Date(),
        queryType: 'basic_query',
        success: true
      })

    } catch (error) {
      const responseTime = Date.now() - startTime
      this.recordPerformanceMetric({
        responseTime,
        timestamp: new Date(),
        queryType: 'basic_query',
        success: false,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Test all dashboard queries
   */
  private async testDashboardQueries(): Promise<void> {
    const queries = [
      {
        name: 'organizations_count',
        query: {
          measures: [CubeMeasures.ORGANIZATION_COUNT],
          limit: 1
        }
      },
      {
        name: 'members_count_with_filter',
        query: {
          measures: [CubeMeasures.MEMBER_COUNT],
          filters: [{
            member: CubeDimensions.IS_TEAM_MEMBER,
            operator: 'equals',
            values: ['false']
          }],
          limit: 1
        }
      },
      {
        name: 'activities_with_time_dimension',
        query: {
          measures: [CubeMeasures.ACTIVITY_COUNT],
          timeDimensions: [{
            dimension: CubeDimensions.ACTIVITY_DATE,
            dateRange: [
              moment().subtract(7, 'days').format('YYYY-MM-DD'),
              moment().format('YYYY-MM-DD')
            ]
          }],
          limit: 1
        }
      }
    ]

    for (const { name, query } of queries) {
      const startTime = Date.now()
      
      try {
        await this.cubeService.load(query)
        
        const responseTime = Date.now() - startTime
        this.recordPerformanceMetric({
          responseTime,
          timestamp: new Date(),
          queryType: name,
          success: true
        })

      } catch (error) {
        const responseTime = Date.now() - startTime
        this.recordPerformanceMetric({
          responseTime,
          timestamp: new Date(),
          queryType: name,
          success: false,
          error: error.message
        })
        
        this.logger.warn(`Dashboard query failed: ${name}`, { error: error.message })
      }
    }
  }

  /**
   * Test query response times with various query complexities
   */
  private async testQueryResponseTimes(): Promise<void> {
    const complexQueries = [
      {
        name: 'complex_time_series',
        query: {
          measures: [CubeMeasures.ACTIVITY_COUNT, CubeMeasures.MEMBER_COUNT],
          dimensions: ['Activities.platform'],
          timeDimensions: [{
            dimension: CubeDimensions.ACTIVITY_DATE,
            dateRange: [
              moment().subtract(30, 'days').format('YYYY-MM-DD'),
              moment().format('YYYY-MM-DD')
            ],
            granularity: 'day'
          }],
          limit: 30
        }
      },
      {
        name: 'filtered_aggregation',
        query: {
          measures: [CubeMeasures.ORGANIZATION_COUNT],
          timeDimensions: [{
            dimension: CubeDimensions.ORGANIZATIONS_JOINED_AT,
            dateRange: [
              moment().subtract(90, 'days').format('YYYY-MM-DD'),
              moment().format('YYYY-MM-DD')
            ]
          }],
          filters: [{
            member: CubeDimensions.IS_TEAM_MEMBER,
            operator: 'equals',
            values: ['false']
          }],
          limit: 10
        }
      }
    ]

    for (const { name, query } of complexQueries) {
      const startTime = Date.now()
      
      try {
        await this.cubeService.load(query)
        
        const responseTime = Date.now() - startTime
        this.recordPerformanceMetric({
          responseTime,
          timestamp: new Date(),
          queryType: name,
          success: true
        })

        // Check if response time exceeds threshold
        if (responseTime > this.alertConfig.responseTimeThreshold) {
          this.logger.warn(`Slow query detected: ${name}`, { 
            responseTime, 
            threshold: this.alertConfig.responseTimeThreshold 
          })
        }

      } catch (error) {
        const responseTime = Date.now() - startTime
        this.recordPerformanceMetric({
          responseTime,
          timestamp: new Date(),
          queryType: name,
          success: false,
          error: error.message
        })
      }
    }
  }

  /**
   * Record performance metric
   */
  private recordPerformanceMetric(metric: PerformanceMetrics): void {
    this.performanceHistory.push(metric)
    
    // Keep only recent metrics (last 24 hours)
    const cutoffTime = moment().subtract(24, 'hours').toDate()
    this.performanceHistory = this.performanceHistory.filter(
      m => m.timestamp >= cutoffTime
    )
  }

  /**
   * Calculate performance metrics
   */
  private calculateMetrics(): HealthCheckResult['metrics'] {
    if (this.performanceHistory.length === 0) {
      return {
        avgResponseTime: 0,
        errorRate: 0,
        successfulQueries: 0,
        failedQueries: 0
      }
    }

    const successful = this.performanceHistory.filter(m => m.success)
    const failed = this.performanceHistory.filter(m => !m.success)
    
    const avgResponseTime = successful.length > 0 
      ? successful.reduce((sum, m) => sum + m.responseTime, 0) / successful.length
      : 0

    const errorRate = (failed.length / this.performanceHistory.length) * 100

    return {
      avgResponseTime: Math.round(avgResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      successfulQueries: successful.length,
      failedQueries: failed.length
    }
  }

  /**
   * Check for performance degradation and generate alerts
   */
  private checkPerformanceDegradation(): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = []
    const windowStart = moment().subtract(this.alertConfig.degradationWindowMinutes, 'minutes').toDate()
    const recentMetrics = this.performanceHistory.filter(m => m.timestamp >= windowStart)

    if (recentMetrics.length === 0) {
      return alerts
    }

    // Check response time degradation
    const successfulRecent = recentMetrics.filter(m => m.success)
    if (successfulRecent.length > 0) {
      const avgResponseTime = successfulRecent.reduce((sum, m) => sum + m.responseTime, 0) / successfulRecent.length
      
      if (avgResponseTime > this.alertConfig.responseTimeThreshold) {
        alerts.push({
          type: 'response_time',
          severity: avgResponseTime > this.alertConfig.responseTimeThreshold * 2 ? 'critical' : 'warning',
          message: `Average response time (${Math.round(avgResponseTime)}ms) exceeds threshold (${this.alertConfig.responseTimeThreshold}ms)`,
          timestamp: new Date(),
          metrics: {
            currentValue: avgResponseTime,
            threshold: this.alertConfig.responseTimeThreshold,
            windowMinutes: this.alertConfig.degradationWindowMinutes
          }
        })
      }
    }

    // Check error rate degradation
    const failedRecent = recentMetrics.filter(m => !m.success)
    const errorRate = (failedRecent.length / recentMetrics.length) * 100
    
    if (errorRate > this.alertConfig.errorRateThreshold) {
      alerts.push({
        type: 'error_rate',
        severity: errorRate > this.alertConfig.errorRateThreshold * 2 ? 'critical' : 'warning',
        message: `Error rate (${errorRate.toFixed(1)}%) exceeds threshold (${this.alertConfig.errorRateThreshold}%)`,
        timestamp: new Date(),
        metrics: {
          currentValue: errorRate,
          threshold: this.alertConfig.errorRateThreshold,
          windowMinutes: this.alertConfig.degradationWindowMinutes
        }
      })
    }

    // Check availability
    if (recentMetrics.length > 0 && successfulRecent.length === 0) {
      alerts.push({
        type: 'availability',
        severity: 'critical',
        message: `No successful queries in the last ${this.alertConfig.degradationWindowMinutes} minutes`,
        timestamp: new Date(),
        metrics: {
          currentValue: 0,
          threshold: 1,
          windowMinutes: this.alertConfig.degradationWindowMinutes
        }
      })
    }

    return alerts
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): HealthCheckResult['metrics'] {
    return this.calculateMetrics()
  }

  /**
   * Get recent performance history
   */
  getPerformanceHistory(hours: number = 1): PerformanceMetrics[] {
    const cutoffTime = moment().subtract(hours, 'hours').toDate()
    return this.performanceHistory.filter(m => m.timestamp >= cutoffTime)
  }

  /**
   * Clear performance history
   */
  clearPerformanceHistory(): void {
    this.performanceHistory = []
    this.logger.info('Performance history cleared')
  }
}