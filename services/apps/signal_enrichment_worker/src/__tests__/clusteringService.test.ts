import { ClusteringService } from '../service/clusteringService'

describe('ClusteringService', () => {
  let clusteringService: ClusteringService

  beforeEach(() => {
    clusteringService = new ClusteringService()
  })

  test('should instantiate ClusteringService', () => {
    expect(clusteringService).toBeInstanceOf(ClusteringService)
  })

  test('should have required methods', () => {
    expect(typeof clusteringService.clusterSignals).toBe('function')
    expect(typeof clusteringService.updateConfig).toBe('function')
    expect(typeof clusteringService.getConfig).toBe('function')
  })

  test('should return default configuration', () => {
    const config = clusteringService.getConfig()
    expect(config).toHaveProperty('minClusterSize')
    expect(config).toHaveProperty('outlierClusterId')
    expect(typeof config.minClusterSize).toBe('number')
    expect(typeof config.outlierClusterId).toBe('number')
  })

  test('should handle empty signal list', async () => {
    const result = await clusteringService.clusterSignals([])
    expect(result.assignments).toEqual([])
    expect(result.clusterStats).toEqual([])
    expect(result.outliers).toEqual([])
  })

  test('should mark all signals as outliers when below minimum cluster size', async () => {
    const signals = [
      { id: 'signal1', embedding: [1, 2, 3] },
      { id: 'signal2', embedding: [4, 5, 6] }
    ]

    const result = await clusteringService.clusterSignals(signals)
    
    expect(result.assignments).toHaveLength(2)
    expect(result.outliers).toHaveLength(2)
    expect(result.clusterStats).toHaveLength(0)
    
    // All should be marked as outliers
    result.assignments.forEach(assignment => {
      expect(assignment.clusterId).toBe('-1')
    })
  })
})