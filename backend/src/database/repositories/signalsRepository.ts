import lodash from 'lodash'
import Sequelize from 'sequelize'
import { Error400, Error404 } from '@gitmesh/common'
import SequelizeRepository from './sequelizeRepository'
import { IRepositoryOptions } from './IRepositoryOptions'
import SequelizeFilterUtils from '../utils/sequelizeFilterUtils'
import SignalsCacheInvalidationService from '../../services/signalsCacheInvalidationService'

const { Op } = Sequelize

class SignalsRepository {
  /**
   * Find and count all signals with filtering, pagination, and sorting
   */
  static async findAndCountAll(
    {
      filter = {},
      orderBy = 'timestamp_DESC',
      limit = 50,
      offset = 0,
      cursor = null,
      platform = null,
      memberId = null,
      startDate = null,
      endDate = null,
      classification = null,
      clusterId = null,
      sortBy = 'timestamp',
      sortOrder = 'DESC',
    },
    options: IRepositoryOptions,
  ) {
    const tenant = SequelizeRepository.getCurrentTenant(options)
    const segment = SequelizeRepository.getStrictlySingleActiveSegment(options)

    // Validate pagination parameters
    const pageSize = Math.min(Math.max(parseInt(limit) || 50, 1), 1000)
    const pageOffset = Math.max(parseInt(offset) || 0, 0)

    // Validate sort parameters
    const validSortFields = ['timestamp', 'velocity_score', 'actionability_score', 'novelty_score']
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'timestamp'
    const sortDirection = sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

    // Build where conditions
    const whereConditions: any = {
      tenantId: tenant.id,
      segmentId: segment.id,
      deletedAt: null,
    }

    // Platform filter
    if (platform) {
      whereConditions.platform = platform
    }

    // Member filter
    if (memberId) {
      whereConditions.memberId = memberId
    }

    // Date range filter
    if (startDate || endDate) {
      whereConditions.timestamp = {}
      if (startDate) {
        whereConditions.timestamp[Op.gte] = new Date(startDate)
      }
      if (endDate) {
        whereConditions.timestamp[Op.lte] = new Date(endDate)
      }
    }

    // Classification filter
    if (classification && Array.isArray(classification)) {
      whereConditions[Op.and] = whereConditions[Op.and] || []
      classification.forEach((cls) => {
        whereConditions[Op.and].push(
          Sequelize.literal(`signal_metadata->'classification' ? '${cls}'`)
        )
      })
    }

    // Cluster ID filter
    if (clusterId) {
      whereConditions[Op.and] = whereConditions[Op.and] || []
      whereConditions[Op.and].push(
        Sequelize.literal(`signal_metadata->>'cluster_id' = '${clusterId}'`)
      )
    }

    // Cursor-based pagination
    if (cursor) {
      try {
        const decodedCursor = JSON.parse(Buffer.from(cursor, 'base64').toString())
        if (decodedCursor.timestamp) {
          const cursorOp = sortDirection === 'ASC' ? Op.gt : Op.lt
          whereConditions.timestamp = {
            ...whereConditions.timestamp,
            [cursorOp]: new Date(decodedCursor.timestamp),
          }
        }
      } catch (error) {
        throw new Error400('Invalid cursor format')
      }
    }

    // Build order clause
    let orderClause
    if (sortField === 'timestamp') {
      orderClause = [['timestamp', sortDirection]]
    } else {
      // For score fields, use JSONB path
      const scorePath = `signal_metadata->'scores'->>'${sortField.replace('_score', '')}'`
      orderClause = [[Sequelize.literal(`CAST(${scorePath} AS INTEGER)`), sortDirection]]
    }

    const { count, rows } = await options.database.activity.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: options.database.member,
          as: 'member',
          attributes: ['id', 'displayName', 'username'],
        },
      ],
      attributes: [
        'id',
        'type',
        'platform',
        'timestamp',
        'title',
        'body',
        'url',
        'channel',
        'attributes',
        'signal_metadata',
        'createdAt',
        'updatedAt',
      ],
      order: orderClause,
      limit: pageSize + 1, // Get one extra to check if there are more results
      offset: pageOffset,
    })

    // Check if there are more results
    const hasMore = rows.length > pageSize
    const results = hasMore ? rows.slice(0, pageSize) : rows

    // Generate next cursor
    let nextCursor = null
    if (hasMore && results.length > 0) {
      const lastItem = results[results.length - 1]
      const cursorData = { timestamp: lastItem.timestamp }
      nextCursor = Buffer.from(JSON.stringify(cursorData)).toString('base64')
    }

    // Transform results to Signal format
    const signals = results.map(this.transformToSignal)

    return {
      data: signals,
      pagination: {
        cursor: nextCursor,
        hasMore,
        total: count,
        pageSize,
        offset: pageOffset,
      },
    }
  }

  /**
   * Find a single signal by ID
   */
  static async findById(id, options: IRepositoryOptions) {
    const tenant = SequelizeRepository.getCurrentTenant(options)

    const record = await options.database.activity.findOne({
      where: {
        id,
        tenantId: tenant.id,
        deletedAt: null,
      },
      include: [
        {
          model: options.database.member,
          as: 'member',
          attributes: ['id', 'displayName', 'username'],
        },
      ],
      attributes: [
        'id',
        'type',
        'platform',
        'timestamp',
        'title',
        'body',
        'url',
        'channel',
        'attributes',
        'signal_metadata',
        'createdAt',
        'updatedAt',
      ],
    })

    if (!record) {
      return null
    }

    return this.transformToSignal(record)
  }

  /**
   * Export signals in various formats
   */
  static async export(
    {
      format = 'knowledge_graph',
      startDate = null,
      endDate = null,
    },
    options: IRepositoryOptions,
  ) {
    const tenant = SequelizeRepository.getCurrentTenant(options)
    const segment = SequelizeRepository.getStrictlySingleActiveSegment(options)

    const whereConditions: any = {
      tenantId: tenant.id,
      segmentId: segment.id,
      deletedAt: null,
    }

    // Date range filter
    if (startDate || endDate) {
      whereConditions.timestamp = {}
      if (startDate) {
        whereConditions.timestamp[Op.gte] = new Date(startDate)
      }
      if (endDate) {
        whereConditions.timestamp[Op.lte] = new Date(endDate)
      }
    }

    const records = await options.database.activity.findAll({
      where: whereConditions,
      include: [
        {
          model: options.database.member,
          as: 'member',
          attributes: ['id', 'displayName', 'username'],
        },
      ],
      attributes: [
        'id',
        'type',
        'platform',
        'timestamp',
        'title',
        'body',
        'url',
        'channel',
        'attributes',
        'signal_metadata',
        'createdAt',
        'updatedAt',
      ],
      order: [['timestamp', 'DESC']],
    })

    const signals = records.map(this.transformToSignal)

    if (format === 'knowledge_graph') {
      return this.exportAsKnowledgeGraph(signals)
    } else if (format === 'recommendations') {
      return this.exportAsRecommendations(signals)
    } else {
      throw new Error400('Invalid export format. Supported formats: knowledge_graph, recommendations')
    }
  }

  /**
   * Stream export signals for large datasets using chunked transfer encoding
   */
  static async streamExport(
    {
      format = 'knowledge_graph',
      startDate = null,
      endDate = null,
    },
    res,
    options: IRepositoryOptions,
  ) {
    const tenant = SequelizeRepository.getCurrentTenant(options)
    const segment = SequelizeRepository.getStrictlySingleActiveSegment(options)

    const whereConditions: any = {
      tenantId: tenant.id,
      segmentId: segment.id,
      deletedAt: null,
    }

    // Date range filter
    if (startDate || endDate) {
      whereConditions.timestamp = {}
      if (startDate) {
        whereConditions.timestamp[Op.gte] = new Date(startDate)
      }
      if (endDate) {
        whereConditions.timestamp[Op.lte] = new Date(endDate)
      }
    }

    if (format === 'knowledge_graph') {
      await this.streamKnowledgeGraphExport(whereConditions, res, options)
    } else if (format === 'recommendations') {
      await this.streamRecommendationsExport(whereConditions, res, options)
    } else {
      throw new Error400('Invalid export format. Supported formats: knowledge_graph, recommendations')
    }
  }

  /**
   * Transform activity record to Signal format
   */
  private static transformToSignal(record) {
    const signalMetadata = record.signal_metadata || {}
    const classification = signalMetadata.classification || {}
    const scores = signalMetadata.scores || {}

    return {
      id: record.id,
      type: record.type,
      platform: record.platform,
      timestamp: record.timestamp,
      member: record.member ? {
        id: record.member.id,
        displayName: record.member.displayName || record.member.username,
      } : null,
      content: {
        title: record.title,
        body: record.body,
        url: record.url,
      },
      channel: record.channel,
      classification: {
        productArea: classification.product_area || [],
        sentiment: classification.sentiment || 'unknown',
        urgency: classification.urgency || 'unknown',
        intent: classification.intent || [],
      },
      scores: {
        velocity: scores.velocity || 0,
        crossPlatform: scores.cross_platform || 0,
        actionability: scores.actionability || 0,
        novelty: scores.novelty || 0,
      },
      clusterId: signalMetadata.cluster_id || null,
      isDuplicate: signalMetadata.is_duplicate || false,
      canonicalId: signalMetadata.canonical_id || null,
      enrichedAt: signalMetadata.enriched_at || null,
      enrichmentVersion: signalMetadata.enrichment_version || null,
    }
  }

  /**
   * Export signals as knowledge graph format (JSON-LD)
   */
  private static exportAsKnowledgeGraph(signals) {
    const nodes = []
    const edges = []
    const clusters = new Set()
    const members = new Set()

    signals.forEach((signal) => {
      // Add signal node with comprehensive properties
      nodes.push({
        '@id': `signal:${signal.id}`,
        '@type': 'Signal',
        platform: signal.platform,
        type: signal.type,
        timestamp: signal.timestamp,
        content: signal.content,
        channel: signal.channel,
        classification: {
          '@type': 'Classification',
          productArea: signal.classification.productArea,
          sentiment: signal.classification.sentiment,
          urgency: signal.classification.urgency,
          intent: signal.classification.intent,
        },
        scores: {
          '@type': 'SignalScores',
          velocity: signal.scores.velocity,
          crossPlatform: signal.scores.crossPlatform,
          actionability: signal.scores.actionability,
          novelty: signal.scores.novelty,
        },
        enrichmentMetadata: {
          enrichedAt: signal.enrichedAt,
          enrichmentVersion: signal.enrichmentVersion,
        },
      })

      // Add member node if exists and not already added
      if (signal.member && !members.has(signal.member.id)) {
        members.add(signal.member.id)
        nodes.push({
          '@id': `member:${signal.member.id}`,
          '@type': 'Member',
          displayName: signal.member.displayName,
        })
      }

      // Add cluster node if exists and not already added
      if (signal.clusterId && !clusters.has(signal.clusterId)) {
        clusters.add(signal.clusterId)
        nodes.push({
          '@id': `cluster:${signal.clusterId}`,
          '@type': 'SignalCluster',
          clusterId: signal.clusterId,
        })
      }

      // Add relationships (edges)
      if (signal.member) {
        edges.push({
          '@type': 'authoredBy',
          '@id': `edge:${signal.id}:authoredBy:${signal.member.id}`,
          source: `signal:${signal.id}`,
          target: `member:${signal.member.id}`,
          relationship: 'AUTHORED_BY',
        })
      }

      if (signal.clusterId) {
        edges.push({
          '@type': 'belongsToCluster',
          '@id': `edge:${signal.id}:belongsToCluster:${signal.clusterId}`,
          source: `signal:${signal.id}`,
          target: `cluster:${signal.clusterId}`,
          relationship: 'BELONGS_TO_CLUSTER',
        })
      }

      if (signal.isDuplicate && signal.canonicalId) {
        edges.push({
          '@type': 'duplicateOf',
          '@id': `edge:${signal.id}:duplicateOf:${signal.canonicalId}`,
          source: `signal:${signal.id}`,
          target: `signal:${signal.canonicalId}`,
          relationship: 'DUPLICATE_OF',
        })
      }

      // Add classification relationships
      signal.classification.productArea.forEach((area) => {
        edges.push({
          '@type': 'classifiedAs',
          '@id': `edge:${signal.id}:classifiedAs:productArea:${area}`,
          source: `signal:${signal.id}`,
          target: `classification:productArea:${area}`,
          relationship: 'CLASSIFIED_AS',
          classificationType: 'productArea',
          classificationValue: area,
        })
      })

      signal.classification.intent.forEach((intent) => {
        edges.push({
          '@type': 'classifiedAs',
          '@id': `edge:${signal.id}:classifiedAs:intent:${intent}`,
          source: `signal:${signal.id}`,
          target: `classification:intent:${intent}`,
          relationship: 'CLASSIFIED_AS',
          classificationType: 'intent',
          classificationValue: intent,
        })
      })

      // Add sentiment and urgency relationships
      if (signal.classification.sentiment !== 'unknown') {
        edges.push({
          '@type': 'classifiedAs',
          '@id': `edge:${signal.id}:classifiedAs:sentiment:${signal.classification.sentiment}`,
          source: `signal:${signal.id}`,
          target: `classification:sentiment:${signal.classification.sentiment}`,
          relationship: 'CLASSIFIED_AS',
          classificationType: 'sentiment',
          classificationValue: signal.classification.sentiment,
        })
      }

      if (signal.classification.urgency !== 'unknown') {
        edges.push({
          '@type': 'classifiedAs',
          '@id': `edge:${signal.id}:classifiedAs:urgency:${signal.classification.urgency}`,
          source: `signal:${signal.id}`,
          target: `classification:urgency:${signal.classification.urgency}`,
          relationship: 'CLASSIFIED_AS',
          classificationType: 'urgency',
          classificationValue: signal.classification.urgency,
        })
      }
    })

    // Add classification category nodes
    const classificationCategories = new Set()
    edges.forEach((edge) => {
      if (edge['@type'] === 'classifiedAs' && edge.target.startsWith('classification:')) {
        if (!classificationCategories.has(edge.target)) {
          classificationCategories.add(edge.target)
          const [, type, value] = edge.target.split(':')
          nodes.push({
            '@id': edge.target,
            '@type': 'ClassificationCategory',
            classificationType: type,
            value: value,
          })
        }
      }
    })

    return {
      '@context': {
        '@vocab': 'https://schema.org/',
        'signal': 'https://gitmesh.com/schema/signal#',
        'member': 'https://gitmesh.com/schema/member#',
        'cluster': 'https://gitmesh.com/schema/cluster#',
        'classification': 'https://gitmesh.com/schema/classification#',
      },
      '@type': 'Graph',
      '@graph': {
        nodes,
        edges,
      },
      metadata: {
        exportedAt: new Date().toISOString(),
        totalSignals: signals.length,
        totalNodes: nodes.length,
        totalEdges: edges.length,
        totalMembers: members.size,
        totalClusters: clusters.size,
      },
    }
  }

  /**
   * Update activity signal metadata and invalidate related cache
   */
  static async updateSignalMetadata(
    activityId: string,
    signalMetadata: any,
    options: IRepositoryOptions,
  ) {
    const tenant = SequelizeRepository.getCurrentTenant(options)
    
    // Update the activity
    const [updatedCount] = await options.database.activity.update(
      { signal_metadata: signalMetadata },
      {
        where: {
          id: activityId,
          tenantId: tenant.id,
          deletedAt: null,
        },
      }
    )

    if (updatedCount > 0) {
      // Invalidate cache for this activity
      const cacheService = new SignalsCacheInvalidationService(options)
      await cacheService.invalidateForActivity(tenant.id, activityId)
    }

    return updatedCount
  }

  /**
   * Bulk update signal metadata for multiple activities
   */
  static async bulkUpdateSignalMetadata(
    updates: Array<{ activityId: string; signalMetadata: any }>,
    options: IRepositoryOptions,
  ) {
    const tenant = SequelizeRepository.getCurrentTenant(options)
    const cacheService = new SignalsCacheInvalidationService(options)

    // Perform bulk updates
    const updatePromises = updates.map(({ activityId, signalMetadata }) =>
      options.database.activity.update(
        { signal_metadata: signalMetadata },
        {
          where: {
            id: activityId,
            tenantId: tenant.id,
            deletedAt: null,
          },
        }
      )
    )

    const results = await Promise.all(updatePromises)
    const updatedCount = results.reduce((sum, [count]) => sum + count, 0)

    if (updatedCount > 0) {
      // Invalidate all cache for the tenant since multiple activities were updated
      await cacheService.invalidateAllForTenant(tenant.id)
    }

    return updatedCount
  }

  /**
   * Update activity and invalidate cache by member
   */
  static async updateActivityForMember(
    memberId: string,
    updates: any,
    options: IRepositoryOptions,
  ) {
    const tenant = SequelizeRepository.getCurrentTenant(options)
    
    const [updatedCount] = await options.database.activity.update(
      updates,
      {
        where: {
          memberId,
          tenantId: tenant.id,
          deletedAt: null,
        },
      }
    )

    if (updatedCount > 0) {
      // Invalidate cache for this member
      const cacheService = new SignalsCacheInvalidationService(options)
      await cacheService.invalidateForMember(tenant.id, memberId)
    }

    return updatedCount
  }

  /**
   * Update activities for a platform and invalidate cache
   */
  static async updateActivitiesForPlatform(
    platform: string,
    updates: any,
    options: IRepositoryOptions,
  ) {
    const tenant = SequelizeRepository.getCurrentTenant(options)
    
    const [updatedCount] = await options.database.activity.update(
      updates,
      {
        where: {
          platform,
          tenantId: tenant.id,
          deletedAt: null,
        },
      }
    )

    if (updatedCount > 0) {
      // Invalidate cache for this platform
      const cacheService = new SignalsCacheInvalidationService(options)
      await cacheService.invalidateForPlatform(tenant.id, platform)
    }

    return updatedCount
  }

  /**
   * Update cluster assignments and invalidate cache
   */
  static async updateClusterAssignments(
    clusterUpdates: Array<{ activityId: string; clusterId: string }>,
    options: IRepositoryOptions,
  ) {
    const tenant = SequelizeRepository.getCurrentTenant(options)
    const cacheService = new SignalsCacheInvalidationService(options)

    // Group updates by cluster for efficient cache invalidation
    const clusterIds = new Set<string>()

    const updatePromises = clusterUpdates.map(({ activityId, clusterId }) => {
      clusterIds.add(clusterId)
      
      return options.database.activity.update(
        {
          signal_metadata: Sequelize.literal(`
            COALESCE(signal_metadata, '{}'::jsonb) || 
            jsonb_build_object('cluster_id', '${clusterId}')
          `)
        },
        {
          where: {
            id: activityId,
            tenantId: tenant.id,
            deletedAt: null,
          },
        }
      )
    })

    const results = await Promise.all(updatePromises)
    const updatedCount = results.reduce((sum, [count]) => sum + count, 0)

    if (updatedCount > 0) {
      // Invalidate cache for all affected clusters
      const invalidationPromises = Array.from(clusterIds).map(clusterId =>
        cacheService.invalidateForCluster(tenant.id, clusterId)
      )
      await Promise.all(invalidationPromises)
    }

    return updatedCount
  }

  /**
   * Export signals as recommendations format (JSONL)
   */
  private static exportAsRecommendations(signals) {
    return signals.map((signal) => ({
      user_id: signal.member?.id || null,
      item_id: signal.id,
      timestamp: signal.timestamp,
      labels: {
        platform: signal.platform,
        type: signal.type,
        channel: signal.channel,
        classification: {
          product_area: signal.classification.productArea,
          sentiment: signal.classification.sentiment,
          urgency: signal.classification.urgency,
          intent: signal.classification.intent,
        },
        scores: {
          velocity: signal.scores.velocity,
          cross_platform: signal.scores.crossPlatform,
          actionability: signal.scores.actionability,
          novelty: signal.scores.novelty,
        },
        cluster_id: signal.clusterId,
        is_duplicate: signal.isDuplicate,
        canonical_id: signal.canonicalId,
        enrichment: {
          enriched_at: signal.enrichedAt,
          enrichment_version: signal.enrichmentVersion,
        },
      },
      metadata: {
        content_title: signal.content.title,
        content_url: signal.content.url,
        member_display_name: signal.member?.displayName,
        export_timestamp: new Date().toISOString(),
      },
    }))
  }

  /**
   * Stream knowledge graph export in chunks
   */
  private static async streamKnowledgeGraphExport(whereConditions, res, options: IRepositoryOptions) {
    const batchSize = 1000
    let offset = 0
    let hasMore = true
    
    // Start JSON-LD structure with enhanced context
    res.write(`{
      "@context": {
        "@vocab": "https://schema.org/",
        "signal": "https://gitmesh.com/schema/signal#",
        "member": "https://gitmesh.com/schema/member#",
        "cluster": "https://gitmesh.com/schema/cluster#",
        "classification": "https://gitmesh.com/schema/classification#"
      },
      "@type": "Graph",
      "@graph": {
        "nodes": [`)
    
    let isFirstNode = true
    let allEdges = []
    let totalSignals = 0
    const members = new Set()
    const clusters = new Set()
    const classificationCategories = new Set()

    while (hasMore) {
      const records = await options.database.activity.findAll({
        where: whereConditions,
        include: [
          {
            model: options.database.member,
            as: 'member',
            attributes: ['id', 'displayName', 'username'],
          },
        ],
        attributes: [
          'id',
          'type',
          'platform',
          'timestamp',
          'title',
          'body',
          'url',
          'channel',
          'attributes',
          'signal_metadata',
          'createdAt',
          'updatedAt',
        ],
        order: [['timestamp', 'DESC']],
        limit: batchSize,
        offset,
      })

      if (records.length === 0) {
        hasMore = false
        break
      }

      const signals = records.map(this.transformToSignal)
      totalSignals += signals.length
      
      // Process each signal in the batch
      for (const signal of signals) {
        // Add signal node with comprehensive properties
        const signalNode = {
          '@id': `signal:${signal.id}`,
          '@type': 'Signal',
          platform: signal.platform,
          type: signal.type,
          timestamp: signal.timestamp,
          content: signal.content,
          channel: signal.channel,
          classification: {
            '@type': 'Classification',
            productArea: signal.classification.productArea,
            sentiment: signal.classification.sentiment,
            urgency: signal.classification.urgency,
            intent: signal.classification.intent,
          },
          scores: {
            '@type': 'SignalScores',
            velocity: signal.scores.velocity,
            crossPlatform: signal.scores.crossPlatform,
            actionability: signal.scores.actionability,
            novelty: signal.scores.novelty,
          },
          enrichmentMetadata: {
            enrichedAt: signal.enrichedAt,
            enrichmentVersion: signal.enrichmentVersion,
          },
        }

        if (!isFirstNode) {
          res.write(',')
        }
        res.write(JSON.stringify(signalNode))
        isFirstNode = false

        // Add member node if exists and not already added
        if (signal.member && !members.has(signal.member.id)) {
          members.add(signal.member.id)
          const memberNode = {
            '@id': `member:${signal.member.id}`,
            '@type': 'Member',
            displayName: signal.member.displayName,
          }
          res.write(',')
          res.write(JSON.stringify(memberNode))
        }

        // Add cluster node if exists and not already added
        if (signal.clusterId && !clusters.has(signal.clusterId)) {
          clusters.add(signal.clusterId)
          const clusterNode = {
            '@id': `cluster:${signal.clusterId}`,
            '@type': 'SignalCluster',
            clusterId: signal.clusterId,
          }
          res.write(',')
          res.write(JSON.stringify(clusterNode))
        }

        // Collect edges for relationships
        if (signal.member) {
          allEdges.push({
            '@type': 'authoredBy',
            '@id': `edge:${signal.id}:authoredBy:${signal.member.id}`,
            source: `signal:${signal.id}`,
            target: `member:${signal.member.id}`,
            relationship: 'AUTHORED_BY',
          })
        }

        if (signal.clusterId) {
          allEdges.push({
            '@type': 'belongsToCluster',
            '@id': `edge:${signal.id}:belongsToCluster:${signal.clusterId}`,
            source: `signal:${signal.id}`,
            target: `cluster:${signal.clusterId}`,
            relationship: 'BELONGS_TO_CLUSTER',
          })
        }

        if (signal.isDuplicate && signal.canonicalId) {
          allEdges.push({
            '@type': 'duplicateOf',
            '@id': `edge:${signal.id}:duplicateOf:${signal.canonicalId}`,
            source: `signal:${signal.id}`,
            target: `signal:${signal.canonicalId}`,
            relationship: 'DUPLICATE_OF',
          })
        }

        // Add classification relationships
        signal.classification.productArea.forEach((area) => {
          const categoryId = `classification:productArea:${area}`
          if (!classificationCategories.has(categoryId)) {
            classificationCategories.add(categoryId)
            const categoryNode = {
              '@id': categoryId,
              '@type': 'ClassificationCategory',
              classificationType: 'productArea',
              value: area,
            }
            res.write(',')
            res.write(JSON.stringify(categoryNode))
          }
          
          allEdges.push({
            '@type': 'classifiedAs',
            '@id': `edge:${signal.id}:classifiedAs:productArea:${area}`,
            source: `signal:${signal.id}`,
            target: categoryId,
            relationship: 'CLASSIFIED_AS',
            classificationType: 'productArea',
            classificationValue: area,
          })
        })

        signal.classification.intent.forEach((intent) => {
          const categoryId = `classification:intent:${intent}`
          if (!classificationCategories.has(categoryId)) {
            classificationCategories.add(categoryId)
            const categoryNode = {
              '@id': categoryId,
              '@type': 'ClassificationCategory',
              classificationType: 'intent',
              value: intent,
            }
            res.write(',')
            res.write(JSON.stringify(categoryNode))
          }
          
          allEdges.push({
            '@type': 'classifiedAs',
            '@id': `edge:${signal.id}:classifiedAs:intent:${intent}`,
            source: `signal:${signal.id}`,
            target: categoryId,
            relationship: 'CLASSIFIED_AS',
            classificationType: 'intent',
            classificationValue: intent,
          })
        })

        // Add sentiment and urgency relationships
        if (signal.classification.sentiment !== 'unknown') {
          const categoryId = `classification:sentiment:${signal.classification.sentiment}`
          if (!classificationCategories.has(categoryId)) {
            classificationCategories.add(categoryId)
            const categoryNode = {
              '@id': categoryId,
              '@type': 'ClassificationCategory',
              classificationType: 'sentiment',
              value: signal.classification.sentiment,
            }
            res.write(',')
            res.write(JSON.stringify(categoryNode))
          }
          
          allEdges.push({
            '@type': 'classifiedAs',
            '@id': `edge:${signal.id}:classifiedAs:sentiment:${signal.classification.sentiment}`,
            source: `signal:${signal.id}`,
            target: categoryId,
            relationship: 'CLASSIFIED_AS',
            classificationType: 'sentiment',
            classificationValue: signal.classification.sentiment,
          })
        }

        if (signal.classification.urgency !== 'unknown') {
          const categoryId = `classification:urgency:${signal.classification.urgency}`
          if (!classificationCategories.has(categoryId)) {
            classificationCategories.add(categoryId)
            const categoryNode = {
              '@id': categoryId,
              '@type': 'ClassificationCategory',
              classificationType: 'urgency',
              value: signal.classification.urgency,
            }
            res.write(',')
            res.write(JSON.stringify(categoryNode))
          }
          
          allEdges.push({
            '@type': 'classifiedAs',
            '@id': `edge:${signal.id}:classifiedAs:urgency:${signal.classification.urgency}`,
            source: `signal:${signal.id}`,
            target: categoryId,
            relationship: 'CLASSIFIED_AS',
            classificationType: 'urgency',
            classificationValue: signal.classification.urgency,
          })
        }
      }

      offset += batchSize
      hasMore = records.length === batchSize
    }

    // Write edges
    res.write('], "edges": [')
    for (let i = 0; i < allEdges.length; i++) {
      if (i > 0) {
        res.write(',')
      }
      res.write(JSON.stringify(allEdges[i]))
    }
    
    // Close JSON-LD structure with metadata
    res.write(`]},
      "metadata": {
        "exportedAt": "${new Date().toISOString()}",
        "totalSignals": ${totalSignals},
        "totalMembers": ${members.size},
        "totalClusters": ${clusters.size},
        "totalClassificationCategories": ${classificationCategories.size},
        "totalEdges": ${allEdges.length}
      }
    }`)
    res.end()
  }

  /**
   * Stream recommendations export in JSONL format
   */
  private static async streamRecommendationsExport(whereConditions, res, options: IRepositoryOptions) {
    const batchSize = 1000
    let offset = 0
    let hasMore = true

    while (hasMore) {
      const records = await options.database.activity.findAll({
        where: whereConditions,
        include: [
          {
            model: options.database.member,
            as: 'member',
            attributes: ['id', 'displayName', 'username'],
          },
        ],
        attributes: [
          'id',
          'type',
          'platform',
          'timestamp',
          'title',
          'body',
          'url',
          'channel',
          'attributes',
          'signal_metadata',
          'createdAt',
          'updatedAt',
        ],
        order: [['timestamp', 'DESC']],
        limit: batchSize,
        offset,
      })

      if (records.length === 0) {
        hasMore = false
        break
      }

      const signals = records.map(this.transformToSignal)
      const recommendations = this.exportAsRecommendations(signals)
      
      // Write each recommendation as a separate line (JSONL format)
      for (const recommendation of recommendations) {
        res.write(JSON.stringify(recommendation) + '\n')
      }

      offset += batchSize
      hasMore = records.length === batchSize
    }

    res.end()
  }
}

export default SignalsRepository