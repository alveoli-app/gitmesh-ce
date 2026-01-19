import axios from 'axios'
import { HackerNewsPost, HackerNewsResponse, HackerNewsUser } from '../types'
import { IProcessStreamContext } from '../../../types'

async function getPost(input: string, ctx: IProcessStreamContext): Promise<HackerNewsResponse | null> {
  try {
    ctx.log.info({ message: 'Fetching post from Hacker News', input })
    const postUrl = `https://hacker-news.firebaseio.com/v0/item/${input}.json`
    const postConfig = {
      method: 'get',
      url: postUrl,
      timeout: 30000, // 30 seconds timeout
    }

    const postResponse: HackerNewsPost = (await axios(postConfig)).data
    
    // Handle deleted or non-existent posts
    if (!postResponse || postResponse.deleted || !postResponse.by) {
      ctx.log.warn({ input }, 'Post is deleted, removed, or does not exist')
      return null
    }
    
    const userId = postResponse.by

    const userUrl = `https://hacker-news.firebaseio.com/v0/user/${userId}.json`
    const userConfig = {
      method: 'get',
      url: userUrl,
      timeout: 30000, // 30 seconds timeout
    }

    const userResponse: HackerNewsUser = (await axios(userConfig)).data
    
    // Handle deleted or non-existent users
    if (!userResponse) {
      ctx.log.warn({ userId }, 'User does not exist or was deleted')
      return null
    }

    return {
      ...postResponse,
      user: userResponse,
    }
  } catch (err) {
    ctx.log.error({ err, input }, 'Error while getting post')
    throw err
  }
}

export default getPost
