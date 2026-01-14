import axios, { AxiosRequestConfig, AxiosError } from 'axios'
import { IProcessStreamContext } from '../../../types'
import { GroupsioCookieExpiredError } from '../types'

const isCookieExpiredError = (err: unknown): boolean => {
  if (axios.isAxiosError(err)) {
    const axiosError = err as AxiosError
    // Check for 401/403 status codes indicating authentication failure
    if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
      return true
    }
    // Check error message for cookie-related errors
    const errorMessage = axiosError.response?.data
      ? JSON.stringify(axiosError.response.data).toLowerCase()
      : ''
    if (
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('forbidden') ||
      errorMessage.includes('invalid') ||
      errorMessage.includes('expired') ||
      errorMessage.includes('authentication')
    ) {
      return true
    }
  }
  return false
}

export const getMessagesFromTopic = async (
  topicId: string,
  cookie: string,
  ctx: IProcessStreamContext,
  page: string = null,
) => {
  const config: AxiosRequestConfig = {
    method: 'get',
    url:
      `https://groups.io/api/v1/gettopic?topic_id=${topicId}` + (page ? `&page_token=${page}` : ''),
    headers: {
      Cookie: cookie,
    },
  }

  try {
    const response = await axios(config)
    return response.data
  } catch (err) {
    if (isCookieExpiredError(err)) {
      ctx.log.warn(
        { topicId, operation: 'getMessagesFromTopic' },
        'Groups.io cookie expired while fetching messages',
      )
      throw new GroupsioCookieExpiredError(undefined, 'getMessagesFromTopic')
    }
    ctx.log.error(err, { topic_id: topicId, operation: 'getMessagesFromTopic' }, 'Error fetching messages from topic_id!')
    throw err
  }
}
