import { IdentityService } from '../service/identityService'
import { ActivityData } from '../repo/activity.repo'

// Mock the dependencies
jest.mock('../repo/member.repo')
jest.mock('../repo/memberIdentity.repo')
jest.mock('@gitmesh/logging')

describe('IdentityService', () => {
  let identityService: IdentityService

  beforeEach(() => {
    identityService = new IdentityService()
  })

  describe('extractIdentityInfo', () => {
    it('should extract identity information from activity attributes', () => {
      const activity: ActivityData = {
        id: 'test-activity-1',
        type: 'issue-created',
        platform: 'github',
        timestamp: new Date(),
        sourceId: 'user123',
        tenantId: 'tenant-1',
        attributes: {
          username: 'testuser',
          author: {
            email: 'test@example.com',
            displayName: 'Test User'
          }
        }
      }

      // Access the private method through type assertion
      const extractIdentityInfo = (identityService as any).extractIdentityInfo.bind(identityService)
      const result = extractIdentityInfo(activity)

      expect(result).toEqual({
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        sourceId: 'user123'
      })
    })

    it('should handle missing attributes gracefully', () => {
      const activity: ActivityData = {
        id: 'test-activity-2',
        type: 'comment',
        platform: 'discord',
        timestamp: new Date(),
        sourceId: 'discord123',
        tenantId: 'tenant-1',
        attributes: {}
      }

      const extractIdentityInfo = (identityService as any).extractIdentityInfo.bind(identityService)
      const result = extractIdentityInfo(activity)

      expect(result).toEqual({
        username: undefined,
        email: undefined,
        displayName: undefined,
        sourceId: 'discord123'
      })
    })
  })

  describe('resolveIdentity', () => {
    it('should throw error when no identity information is available', async () => {
      const activity: ActivityData = {
        id: 'test-activity-3',
        type: 'unknown',
        platform: 'test',
        timestamp: new Date(),
        sourceId: '',
        tenantId: 'tenant-1',
        attributes: {}
      }

      await expect(identityService.resolveIdentity(activity)).rejects.toThrow(
        'No identity information found in activity'
      )
    })
  })
})