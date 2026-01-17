import { LoggerBase } from '@gitmesh/logging'
import axios from 'axios'
import moment from 'moment'
import {
  SignalsAction,
  SignalsContent,
  SignalsPostWithActions,
  SignalsPublishedDates,
  SignalsRawPost,
  SignalsSettings,
  PageData,
  QueryData,
} from '@gitmesh/types'
import { Error400 } from '@gitmesh/common'
import { SIGNALS_CONFIG } from '../conf'
import SignalsContentRepository from '../database/repositories/signalsContentRepository'
import SequelizeRepository from '../database/repositories/sequelizeRepository'
import TenantUserRepository from '../database/repositories/tenantUserRepository'
import track from '../segment/track'
import { IServiceOptions } from './IServiceOptions'

export interface SignalsContentUpsertData extends SignalsAction {
  content: SignalsContent
}

export default class SignalsContentService extends LoggerBase {
  options: IServiceOptions

  constructor(options: IServiceOptions) {
    super(options.log)
    this.options = options
  }

  /**
   * Create an signals shown content record.
   * @param data Data to a new SignalsContent record.
   * @param options Repository options.
   * @returns Created SignalsContent record.
   */
  async upsert(data: SignalsContent): Promise<SignalsContent | null> {
    if (!data.url) {
      throw new Error400(this.options.language, 'errors.signals.urlRequiredWhenUpserting')
    }
    const transaction = await SequelizeRepository.createTransaction(this.options)

    try {
      // find by url
      const existing = await SignalsContentRepository.findByUrl(data.url, {
        ...this.options,
        transaction,
      })

      let record

      if (existing) {
        record = await SignalsContentRepository.update(existing.id, data, {
          ...this.options,
          transaction,
        })
      } else {
        record = await SignalsContentRepository.create(data, {
          ...this.options,
          transaction,
        })
      }

      await SequelizeRepository.commitTransaction(transaction)

      return record
    } catch (error) {
      await SequelizeRepository.rollbackTransaction(transaction)
      throw error
    }
  }

  async findById(id: string): Promise<SignalsContent> {
    return SignalsContentRepository.findById(id, this.options)
  }

  async query(data: QueryData): Promise<PageData<SignalsContent>> {
    const advancedFilter = data.filter
    const orderBy = data.orderBy
    const limit = data.limit
    const offset = data.offset
    return SignalsContentRepository.findAndCountAll(
      { advancedFilter, orderBy, limit, offset },
      this.options,
    )
  }

  static trackPostClicked(url: string, platform: string, req: any, source: string = 'app'): void {
    track(
      'Signals post clicked',
      {
        url,
        platform,
        source,
      },
      { ...req },
    )
  }

  static trackDigestEmailOpened(req: any): void {
    track('Signals digest opened', {}, { ...req })
  }

  /**
   * Convert a relative string date to a Date. For example, 30 days ago -> 2020-01-01
   * @param date String date. Can be one of SignalsPublishedDates
   * @returns The corresponding Date
   */
  static switchDate(date: string, offset = 0) {
    let dateMoment
    switch (date) {
      case SignalsPublishedDates.LAST_24_HOURS:
        dateMoment = moment().subtract(1, 'days')
        break
      case SignalsPublishedDates.LAST_7_DAYS:
        dateMoment = moment().subtract(7, 'days')
        break
      case SignalsPublishedDates.LAST_14_DAYS:
        dateMoment = moment().subtract(14, 'days')
        break
      case SignalsPublishedDates.LAST_30_DAYS:
        dateMoment = moment().subtract(30, 'days')
        break
      case SignalsPublishedDates.LAST_90_DAYS:
        dateMoment = moment().subtract(90, 'days')
        break
      default:
        return null
    }
    return dateMoment.subtract(offset, 'days').format('YYYY-MM-DD')
  }

  async search(email = false) {
    const signalsSettings: SignalsSettings = (
      await TenantUserRepository.findByTenantAndUser(
        this.options.currentTenant.id,
        this.options.currentUser.id,
        this.options,
      )
    ).settings.signals

    if (!signalsSettings.onboarded) {
      throw new Error400(this.options.language, 'errors.signals.notOnboarded')
    }

    const feedSettings = email ? signalsSettings.emailDigest.feed : signalsSettings.feed

    const keywords = feedSettings.keywords || []
    const exactKeywords = feedSettings.exactKeywords || []
    const excludedKeywords = feedSettings.excludedKeywords || []
    const platforms = feedSettings.platforms || []

    const afterDate = SignalsContentService.switchDate(feedSettings.publishedDate)

    // Check if external Signals API is configured
    const useExternalAPI = SIGNALS_CONFIG?.url && SIGNALS_CONFIG?.apiKey

    let activitiesData: SignalsRawPost[] = []

    if (useExternalAPI) {
      // Use external Signals API
      const config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `${SIGNALS_CONFIG.url}`,
        params: {
          platforms: platforms.join(','),
          keywords: keywords.join(','),
          exact_keywords: exactKeywords.join(','),
          exclude_keywords: excludedKeywords.join(','),
          after_date: afterDate,
        },
        headers: {
          Authorization: `Bearer ${SIGNALS_CONFIG.apiKey}`,
        },
      }

      const response = await axios(config)
      activitiesData = response.data as SignalsRawPost[]
    } else {
      // Fetch from local activities table
      const { database } = this.options
      const { Op } = require('sequelize')

      this.log.info({ platforms, keywords, exactKeywords, excludedKeywords, afterDate }, 'Fetching signals from local activities table')

      const whereConditions: any = {
        tenantId: this.options.currentTenant.id,
        deletedAt: null,
      }

      // Filter by platforms
      if (platforms.length > 0) {
        whereConditions.platform = { [Op.in]: platforms }
      }

      // Filter by date
      if (afterDate) {
        whereConditions.timestamp = { [Op.gte]: afterDate }
      }

      // Filter by keywords (search in title, body, or attributes)
      if (keywords.length > 0 || exactKeywords.length > 0 || excludedKeywords.length > 0) {
        const keywordConditions: any[] = []

        // Include keywords (OR condition)
        if (keywords.length > 0) {
          keywords.forEach((keyword) => {
            keywordConditions.push({
              [Op.or]: [
                { title: { [Op.iLike]: `%${keyword}%` } },
                { body: { [Op.iLike]: `%${keyword}%` } },
              ],
            })
          })
        }

        // Exact keywords (OR condition)
        if (exactKeywords.length > 0) {
          exactKeywords.forEach((keyword) => {
            keywordConditions.push({
              [Op.or]: [
                { title: { [Op.iLike]: `%${keyword}%` } },
                { body: { [Op.iLike]: `%${keyword}%` } },
              ],
            })
          })
        }

        if (keywordConditions.length > 0) {
          whereConditions[Op.or] = keywordConditions
        }

        // Exclude keywords (NOT condition)
        if (excludedKeywords.length > 0) {
          const excludeConditions: any[] = []
          excludedKeywords.forEach((keyword) => {
            excludeConditions.push({
              [Op.and]: [
                { title: { [Op.notILike]: `%${keyword}%` } },
                { body: { [Op.notILike]: `%${keyword}%` } },
              ],
            })
          })
          whereConditions[Op.and] = excludeConditions
        }
      }

      // Fetch activities from database
      const activities = await database.activity.findAll({
        where: whereConditions,
        include: [
          {
            model: database.member,
            as: 'member',
            attributes: ['id', 'displayName', 'username', 'attributes'],
          },
        ],
        order: [['timestamp', 'DESC']],
        limit: 100, // Limit results
      })

      this.log.info({ count: activities.length }, 'Fetched activities from database')

      // Transform activities to SignalsRawPost format
      activitiesData = activities.map((activity) => {
        const avatarUrl = activity.member?.attributes?.avatarUrl?.github || 
                         activity.member?.attributes?.avatarUrl || 
                         null
        
        return {
          url: activity.url || `#activity-${activity.id}`,
          date: activity.timestamp,
          platform: activity.platform,
          title: activity.title || `${activity.type} by ${activity.member?.displayName || activity.username}`,
          description: activity.body || activity.title || '',
          thumbnail: avatarUrl,
        }
      })

      this.log.info({ count: activitiesData.length }, 'Transformed activities to signals format')
    }

    // Get interacted posts
    const interacted = (
      await this.query({
        filter: {
          postedAt: { gt: SignalsContentService.switchDate(feedSettings.publishedDate, 90) },
        },
      })
    ).rows

    const interactedMap = {}

    for (const item of interacted) {
      interactedMap[item.url] = item
    }

    // Format output
    const out: SignalsPostWithActions[] = []
    for (const item of activitiesData) {
      const post = {
        description: item.description,
        thumbnail: item.thumbnail,
        title: item.title,
      }
      out.push({
        url: item.url,
        postedAt: item.date,
        post,
        platform: item.platform,
        actions: interactedMap[item.url] ? interactedMap[item.url].actions : [],
      })
    }

    return out
  }

  static async reply(title, description) {
    const config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `${SIGNALS_CONFIG.url}/reply`,
      params: {
        title,
        description,
      },
      headers: {
        Authorization: `Bearer ${SIGNALS_CONFIG.apiKey}`,
      },
    }

    const response = await axios(config)
    return {
      reply: response.data,
    }
  }
}
