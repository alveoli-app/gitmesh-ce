import { IndexingService } from '../service/indexingService'
import { ClusteringOrchestrationService } from '../service/clusteringOrchestrationService'

describe('OpenSearch Integration', () => {
  test('should instantiate IndexingService', () => {
    const indexingService = new IndexingService()
    expect(indexingService).toBeInstanceOf(IndexingService)
  })

  test('should instantiate ClusteringOrchestrationService', () => {
    const clusteringService = new ClusteringOrchestrationService()
    expect(clusteringService).toBeInstanceOf(ClusteringOrchestrationService)
  })

  test('should have clustering configuration methods', () => {
    const clusteringService = new ClusteringOrchestrationService()
    
    expect(typeof clusteringService.getClusteringConfig).toBe('function')
    expect(typeof clusteringService.updateClusteringConfig).toBe('function')
    expect(typeof clusteringService.runClusteringForTenant).toBe('function')
    expect(typeof clusteringService.runClusteringForAllTenants).toBe('function')
    expect(typeof clusteringService.getClusteringStats).toBe('function')
  })

  test('should return valid clustering configuration', () => {
    const clusteringService = new ClusteringOrchestrationService()
    const config = clusteringService.getClusteringConfig()
    
    expect(config).toHaveProperty('minClusterSize')
    expect(config).toHaveProperty('outlierClusterId')
    expect(typeof config.minClusterSize).toBe('number')
    expect(typeof config.outlierClusterId).toBe('number')
    expect(config.minClusterSize).toBeGreaterThan(0)
  })
})