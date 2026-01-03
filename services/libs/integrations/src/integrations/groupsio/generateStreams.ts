// generateStreams.ts content
import { GenerateStreamsHandler } from '../../types'
import {
  GroupsioIntegrationSettings,
  GroupsioStreamType,
  GroupsioGroupMembersStreamMetadata,
} from './types'

const handler: GenerateStreamsHandler = async (ctx) => {
  const settings = ctx.integration.settings as GroupsioIntegrationSettings

  const groups = settings.groups
  const token = settings.token
  const email = settings.email

  ctx.log.info(
    {
      integrationId: ctx.integration.id,
      groupCount: groups?.length || 0,
      hasToken: !!token,
      hasEmail: !!email,
    },
    'Starting Groups.io stream generation',
  )

  if (!groups || groups.length === 0) {
    ctx.log.error({ integrationId: ctx.integration.id }, 'Groups.io integration has no groups configured')
    await ctx.abortRunWithError(
      'No groups specified in Groups.io integration. Please configure at least one group.',
      { errorCode: 'GROUPSIO_NO_GROUPS' },
    )
    return
  }

  if (!token) {
    ctx.log.error({ integrationId: ctx.integration.id }, 'Groups.io integration has no authentication token')
    await ctx.abortRunWithError(
      'No authentication token found. Please reconnect the Groups.io integration.',
      { errorCode: 'GROUPSIO_NO_TOKEN' },
    )
    return
  }

  if (!email) {
    ctx.log.error({ integrationId: ctx.integration.id }, 'Groups.io integration has no email configured')
    await ctx.abortRunWithError(
      'No email address configured for Groups.io integration. Please reconnect the integration.',
      { errorCode: 'GROUPSIO_NO_EMAIL' },
    )
    return
  }

  ctx.log.info(
    { integrationId: ctx.integration.id, groups },
    'Publishing Groups.io group member streams',
  )

  for (const group of groups) {
    // here we start parsing group members - very important to do this first
    // because we need to know who the members are before we can start parsing
    // messages don't have enough information to create members
    await ctx.publishStream<GroupsioGroupMembersStreamMetadata>(
      `${GroupsioStreamType.GROUP_MEMBERS}:${group}`,
      {
        group,
        page: null,
      },
    )
    ctx.log.debug({ group }, 'Published Groups.io group members stream')
  }

  ctx.log.info(
    { integrationId: ctx.integration.id, streamCount: groups.length },
    'Completed Groups.io stream generation',
  )
}

export default handler
