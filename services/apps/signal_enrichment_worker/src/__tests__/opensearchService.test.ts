import { OpenSearchService } from '../service/opensearchService'

describe('OpenSearchService', () => {
  let opensearchService: OpenSearchService

  beforeEach(() => {
    opensearchService = new OpenSearchService()
  })

  test('should instantiate OpenSearchService', () => {
    expect(opensearchService).toBeInstanceOf(OpenSearchService)
  })

  test('should have required methods', () => {
    expect(typeof opensearchService.createIndex).toBe('function')
    expect(typeof opensearchService.indexSignal).toBe('function')
    expect(typeof opensearchService.bulkIndexSignals).toBe('function')
    expect(typeof opensearchService.searchSimilarSignals).toBe('function')
    expect(typeof opensearchService.getAllSignalsForClustering).toBe('function')
    expect(typeof opensearchService.updateClusterAssignments).toBe('function')
    expect(typeof opensearchService.deleteSignal).toBe('function')
    expect(typeof opensearchService.indexExists).toBe('function')
    expect(typeof opensearchService.getIndexStats).toBe('function')
  })
})