import { ProcessWebhookStreamHandler } from '../../types'
import {
  GroupsioWebhookEventType,
  GroupsioWebhookPayload,
  GroupsioWebhookJoinPayload,
  GroupsioPublishDataType,
  GroupsioPublishData,
  //   GroupsioMessageData,
  GroupsioMemberLeftData,
  GroupsioMemberJoinData,
} from './types'

const processWebhookJoin: ProcessWebhookStreamHandler = async (ctx) => {
  const data = ctx.stream.data as GroupsioWebhookPayload<GroupsioWebhookJoinPayload>
  const payload = data.data

  await ctx.publishData<GroupsioPublishData<GroupsioMemberJoinData>>({
    type: GroupsioPublishDataType.MEMBER_JOIN,
    data: {
      member: payload.member_info,
      group: payload.group.name,
      joinedAt: new Date(payload.created).toISOString(),
    },
  })
}

const processWebhookLeft: ProcessWebhookStreamHandler = async (ctx) => {
  const data = ctx.stream.data as GroupsioWebhookPayload<GroupsioWebhookJoinPayload>
  const payload = data.data

  await ctx.publishData<GroupsioPublishData<GroupsioMemberLeftData>>({
    type: GroupsioPublishDataType.MEMBER_LEFT,
    data: {
      member: payload.member_info,
      group: payload.group.name,
      leftAt: new Date(payload.created).toISOString(),
    },
  })
}

// const processWebhookSentMessageAccepted: ProcessWebhookStreamHandler = async (ctx) => {}

const handler: ProcessWebhookStreamHandler = async (ctx) => {
  const { event } = ctx.stream.data as GroupsioWebhookPayload<unknown>

  ctx.log.info(
    { event, integrationId: ctx.integration.id },
    'Processing Groups.io webhook event',
  )

  switch (event) {
    case GroupsioWebhookEventType.JOINED: {
      await processWebhookJoin(ctx)
      ctx.log.debug({ event }, 'Processed Groups.io member join webhook')
      break
    }

    // case GroupsioWebhookEventType.SENT_MESSAGE_ACCEPTED: {
    //   await processWebhookSentMessageAccepted(ctx)
    //   break
    // }

    case GroupsioWebhookEventType.LEFT: {
      await processWebhookLeft(ctx)
      ctx.log.debug({ event }, 'Processed Groups.io member left webhook')
      break
    }

    default: {
      ctx.log.warn(
        { event, integrationId: ctx.integration.id },
        'Unsupported Groups.io webhook event type, skipping',
      )
    }
  }
}

export default handler
