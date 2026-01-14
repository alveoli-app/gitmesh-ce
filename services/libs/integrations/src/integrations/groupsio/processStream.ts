// processStream.ts content
import { IProcessStreamContext, ProcessStreamHandler } from '../../types'
import {
  GroupsioStreamType,
  GroupsioGroupStreamMetadata,
  GroupsioGroupMembersStreamMetadata,
  GroupsioIntegrationSettings,
  GroupsioTopicStreamMetadata,
  GroupsioPublishData,
  GroupsioPublishDataType,
  MemberInfo,
  MemberInfoMinimal,
  ListMembers,
  ListMessages,
  ListTopics,
  GroupsioMessageData,
  GroupsioMemberJoinData,
  GroupsioCookieExpiredError,
} from './types'
import { getTopicsFromGroup } from './api/getTopicsFromGroup'
import { getMessagesFromTopic } from './api/getMessagesFromTopic'
import { getGroupMembers } from './api/getGroupMembers'
import { refreshGroupsioCookie } from './api/refreshCookie'

const cacheMember = async (ctx: IProcessStreamContext, member: MemberInfo): Promise<void> => {
  const cacheKey = `${GroupsioStreamType.GROUP_MEMBERS}:${member.user_id}`
  const cache = ctx.cache

  // cache for 7 days
  await cache.set(cacheKey, JSON.stringify(member), 60 * 60 * 24 * 7)
}

const getMemberFromCache = async (
  ctx: IProcessStreamContext,
  userId: string,
): Promise<MemberInfo | undefined> => {
  const cacheKey = `${GroupsioStreamType.GROUP_MEMBERS}:${userId}`
  const cache = ctx.cache

  const cachedMember = await cache.get(cacheKey)

  if (!cachedMember) {
    return undefined
  }

  return JSON.parse(cachedMember)
}

const processGroupStream: ProcessStreamHandler = async (ctx) => {
  const data = ctx.stream.data as GroupsioGroupStreamMetadata
  let settings = ctx.integration.settings as GroupsioIntegrationSettings

  let response: ListTopics
  try {
    response = (await getTopicsFromGroup(data.group, settings.token, ctx, data.page)) as ListTopics
  } catch (err) {
    if (err instanceof GroupsioCookieExpiredError) {
      ctx.log.info({ group: data.group }, 'Cookie expired, attempting to refresh...')
      try {
        const newCookie = await refreshGroupsioCookie(ctx)
        // Get updated settings after refresh
        settings = ctx.integration.settings as GroupsioIntegrationSettings
        // Retry with new cookie
        response = (await getTopicsFromGroup(data.group, newCookie, ctx, data.page)) as ListTopics
        ctx.log.info({ group: data.group }, 'Successfully retried after cookie refresh')
      } catch (refreshErr) {
        ctx.log.error(
          refreshErr,
          { group: data.group },
          'Failed to refresh cookie or retry operation',
        )
        await ctx.abortRunWithError(
          `Failed to refresh Groups.io authentication for group ${data.group}. Please reconnect the integration.`,
          { group: data.group, error: refreshErr.message },
          refreshErr as Error,
        )
        return
      }
    } else {
      throw err
    }
  }

  // processing next page stream
  if (response?.next_page_token) {
    await ctx.publishStream<GroupsioGroupStreamMetadata>(
      `${GroupsioStreamType.GROUP}:${data.group}-${response.next_page_token}`,
      {
        group: data.group,
        page: response.next_page_token.toString(),
      },
    )
  }

  // publishing topic streams
  for (const topic of response.data) {
    await ctx.publishStream<GroupsioTopicStreamMetadata>(
      `${GroupsioStreamType.TOPIC}:${topic.id}`,
      {
        group: data.group,
        topic,
        page: null,
      },
    )
  }
}

const processTopicStream: ProcessStreamHandler = async (ctx) => {
  const data = ctx.stream.data as GroupsioTopicStreamMetadata
  let settings = ctx.integration.settings as GroupsioIntegrationSettings

  let response: ListMessages
  try {
    response = (await getMessagesFromTopic(
      data.topic.id.toString(),
      settings.token,
      ctx,
      data.page,
    )) as ListMessages
  } catch (err) {
    if (err instanceof GroupsioCookieExpiredError) {
      ctx.log.info({ topicId: data.topic.id }, 'Cookie expired, attempting to refresh...')
      try {
        const newCookie = await refreshGroupsioCookie(ctx)
        // Get updated settings after refresh
        settings = ctx.integration.settings as GroupsioIntegrationSettings
        // Retry with new cookie
        response = (await getMessagesFromTopic(
          data.topic.id.toString(),
          newCookie,
          ctx,
          data.page,
        )) as ListMessages
        ctx.log.info({ topicId: data.topic.id }, 'Successfully retried after cookie refresh')
      } catch (refreshErr) {
        ctx.log.error(
          refreshErr,
          { topicId: data.topic.id },
          'Failed to refresh cookie or retry operation',
        )
        await ctx.abortRunWithError(
          `Failed to refresh Groups.io authentication for topic ${data.topic.id}. Please reconnect the integration.`,
          { topicId: data.topic.id, error: refreshErr.message },
          refreshErr as Error,
        )
        return
      }
    } else {
      throw err
    }
  }

  // processing next page stream
  if (response?.next_page_token) {
    await ctx.publishStream<GroupsioTopicStreamMetadata>(
      `${GroupsioStreamType.TOPIC}:${data.topic.id}-${response.next_page_token}`,
      {
        group: data.group,
        topic: data.topic,
        page: response.next_page_token.toString(),
      },
    )
  }

  // publishing messages
  for (let i = 0; i < response.data.length; i++) {
    const message = response.data[i]
    const userId = message.user_id
    // getting member from cache
    // it should be there already because we process members first
    let member: MemberInfo | MemberInfoMinimal = await getMemberFromCache(ctx, userId.toString())

    if (!member) {
      // we didn't find a member in cache, so it's an anonymous user
      // we need to create a fake member object
      member = {
        user_id: userId,
        full_name: message.name || 'Anonymous User',
        email: 'anonymous+fake+email@groups.io',
        group_id: message.group_id,
      } as MemberInfoMinimal

      ctx.log.warn(
        { userId, messageId: message.id },
        'Member not found in cache, using anonymous member!',
      )
    }

    await ctx.publishData<GroupsioPublishData<GroupsioMessageData>>({
      type: GroupsioPublishDataType.MESSAGE,
      data: {
        message,
        group: data.group,
        topic: data.topic,
        member,
        sourceParentId: i > 0 ? response.data[i - 1].id.toString() : null,
      },
    })
  }
}

const processGroupMembersStream: ProcessStreamHandler = async (ctx) => {
  const data = ctx.stream.data as GroupsioGroupMembersStreamMetadata
  let settings = ctx.integration.settings as GroupsioIntegrationSettings

  let response: ListMembers
  try {
    response = (await getGroupMembers(data.group, settings.token, ctx, data.page)) as ListMembers
  } catch (err) {
    if (err instanceof GroupsioCookieExpiredError) {
      ctx.log.info({ group: data.group }, 'Cookie expired, attempting to refresh...')
      try {
        const newCookie = await refreshGroupsioCookie(ctx)
        // Get updated settings after refresh
        settings = ctx.integration.settings as GroupsioIntegrationSettings
        // Retry with new cookie
        response = (await getGroupMembers(data.group, newCookie, ctx, data.page)) as ListMembers
        ctx.log.info({ group: data.group }, 'Successfully retried after cookie refresh')
      } catch (refreshErr) {
        ctx.log.error(
          refreshErr,
          { group: data.group },
          'Failed to refresh cookie or retry operation',
        )
        await ctx.abortRunWithError(
          `Failed to refresh Groups.io authentication for group ${data.group}. Please reconnect the integration.`,
          { group: data.group, error: refreshErr.message },
          refreshErr as Error,
        )
        return
      }
    } else {
      throw err
    }
  }

  // publish members
  for (const member of response.data) {
    // caching member
    await cacheMember(ctx, member)
    // publishing member
    await ctx.publishData<GroupsioPublishData<GroupsioMemberJoinData>>({
      type: GroupsioPublishDataType.MEMBER_JOIN,
      data: {
        member,
        group: data.group,
        joinedAt: new Date(member.created).toISOString(),
      },
    })
  }

  // processing next page stream
  if (response?.next_page_token) {
    await ctx.publishStream<GroupsioGroupMembersStreamMetadata>(
      `${GroupsioStreamType.GROUP_MEMBERS}:${data.group}-${response.next_page_token}`,
      {
        group: data.group,
        page: response.next_page_token.toString(),
      },
    )
  } else {
    // this is the last page, so we can publish the group streams
    await ctx.publishStream<GroupsioGroupStreamMetadata>(
      `${GroupsioStreamType.GROUP}:${data.group}`,
      {
        group: data.group,
        page: null,
      },
    )
  }
}

const handler: ProcessStreamHandler = async (ctx) => {
  const streamIdentifier = ctx.stream.identifier

  const streamType = streamIdentifier.split(':')[0]

  switch (streamType) {
    case GroupsioStreamType.GROUP:
      await processGroupStream(ctx)
      break
    case GroupsioStreamType.TOPIC:
      await processTopicStream(ctx)
      break
    case GroupsioStreamType.GROUP_MEMBERS:
      await processGroupMembersStream(ctx)
      break
    default:
      await ctx.abortRunWithError(`Unknown stream type: ${streamType}`)
      break
  }
}

export default handler
