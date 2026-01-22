/**
 * Simple test to verify service import works
 */

import { CubeJsService } from '../service'
import CubeDimensions from '../dimensions'
import CubeMeasures from '../measures'

describe('Service Import Test', () => {
  test('should import CubeJsService successfully', () => {
    expect(CubeJsService).toBeDefined()
    expect(typeof CubeJsService).toBe('function')
  })

  test('should import dimensions successfully', () => {
    expect(CubeDimensions).toBeDefined()
    expect(CubeDimensions.MEMBER_COUNT).toBeDefined()
  })

  test('should import measures successfully', () => {
    expect(CubeMeasures).toBeDefined()
    expect(CubeMeasures.MEMBER_COUNT).toBeDefined()
  })

  test('should create service instance', () => {
    const service = new CubeJsService()
    expect(service).toBeDefined()
    expect(service).toBeInstanceOf(CubeJsService)
  })
})