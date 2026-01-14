import axios, { AxiosRequestConfig, AxiosError } from 'axios'
import { IProcessStreamContext } from '../../../types'
import { GroupName, GroupsioCookieExpiredError } from '../types'

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

export const getTopicsFromGroup = async (
  groupName: GroupName,
  cookie: string,
  ctx: IProcessStreamContext,
  page: string = null,
) => {
  const config: AxiosRequestConfig = {
    method: 'get',
    url:
      `https://groups.io/api/v1/gettopics?group_name=${encodeURIComponent(groupName)}` +
      (page ? `&page_token=${page}` : ''),
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
        { groupName, operation: 'getTopicsFromGroup' },
        'Groups.io cookie expired while fetching topics',
      )
      throw new GroupsioCookieExpiredError(groupName, 'getTopicsFromGroup')
    }
    ctx.log.error(err, { groupName, operation: 'getTopicsFromGroup' }, 'Error fetching topics from group!')
    throw err
  }
}
