import { DataTypes } from 'sequelize'

/**
 * Chat Sequelize Models
 * Defines all Chat-related database models for AI command center
 */
export default (sequelize) => {
    // ================================================
    // Chat Conversations
    // ================================================
    const chatConversations = sequelize.define(
        'chatConversations',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            tenantId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            userId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            projectId: {
                type: DataTypes.UUID,
            },
            workspaceId: {
                type: DataTypes.UUID,
            },
            title: {
                type: DataTypes.STRING(500),
            },
            status: {
                type: DataTypes.STRING(20),
                defaultValue: 'active',
            },
            context: {
                type: DataTypes.JSONB,
                defaultValue: {},
            },
            metadata: {
                type: DataTypes.JSONB,
                defaultValue: {},
            },
            lastMessageAt: {
                type: DataTypes.DATE,
            },
            messageCount: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
            },
        },
        {
            tableName: 'chatConversations',
            timestamps: true,
            paranoid: true,
        },
    )

    // ================================================
    // Chat Messages
    // ================================================
    const chatMessages = sequelize.define(
        'chatMessages',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            conversationId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            senderType: {
                type: DataTypes.STRING(20),
                allowNull: false,
            },
            agentId: {
                type: DataTypes.STRING(100),
            },
            content: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            contentType: {
                type: DataTypes.STRING(50),
                defaultValue: 'text',
            },
            metadata: {
                type: DataTypes.JSONB,
                defaultValue: {},
            },
            parentMessageId: {
                type: DataTypes.UUID,
            },
            isStreaming: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
            },
            streamCompletedAt: {
                type: DataTypes.DATE,
            },
            tokensUsed: {
                type: DataTypes.INTEGER,
            },
            durationMs: {
                type: DataTypes.INTEGER,
            },
            feedbackRating: {
                type: DataTypes.INTEGER,
            },
        },
        {
            tableName: 'chatMessages',
            timestamps: true,
        },
    )

    // ================================================
    // Chat Action Proposals
    // ================================================
    const chatActionProposals = sequelize.define(
        'chatActionProposals',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            conversationId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            messageId: {
                type: DataTypes.UUID,
            },
            agentId: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            actionType: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            parameters: {
                type: DataTypes.JSONB,
                allowNull: false,
            },
            reasoning: {
                type: DataTypes.TEXT,
            },
            affectedEntities: {
                type: DataTypes.JSONB,
                defaultValue: [],
            },
            estimatedImpact: {
                type: DataTypes.TEXT,
            },
            confidenceScore: {
                type: DataTypes.DECIMAL(3, 2),
            },
            status: {
                type: DataTypes.STRING(20),
                defaultValue: 'pending',
            },
            rejectionReason: {
                type: DataTypes.TEXT,
            },
            modifiedProposalId: {
                type: DataTypes.UUID,
            },
            expiresAt: {
                type: DataTypes.DATE,
            },
            respondedAt: {
                type: DataTypes.DATE,
            },
            respondedBy: {
                type: DataTypes.UUID,
            },
            batchId: {
                type: DataTypes.UUID,
            },
            batchOrder: {
                type: DataTypes.INTEGER,
            },
        },
        {
            tableName: 'chatActionProposals',
            timestamps: true,
        },
    )

    // ================================================
    // Chat Executed Actions
    // ================================================
    const chatExecutedActions = sequelize.define(
        'chatExecutedActions',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            proposalId: {
                type: DataTypes.UUID,
            },
            conversationId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            tenantId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            executedBy: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            agentId: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            actionType: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            parameters: {
                type: DataTypes.JSONB,
                allowNull: false,
            },
            result: {
                type: DataTypes.JSONB,
            },
            status: {
                type: DataTypes.STRING(20),
                allowNull: false,
            },
            errorMessage: {
                type: DataTypes.TEXT,
            },
            affectedEntityType: {
                type: DataTypes.STRING(100),
            },
            affectedEntityId: {
                type: DataTypes.UUID,
            },
            isReversible: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
            },
            revertedAt: {
                type: DataTypes.DATE,
            },
            revertedBy: {
                type: DataTypes.UUID,
            },
            durationMs: {
                type: DataTypes.INTEGER,
            },
        },
        {
            tableName: 'chatExecutedActions',
            timestamps: true,
            updatedAt: false,
        },
    )

    // ================================================
    // Agent Telemetry
    // ================================================
    const agentTelemetry = sequelize.define(
        'agentTelemetry',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            tenantId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            agentName: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            taskType: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            durationMs: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            tokensUsed: {
                type: DataTypes.INTEGER,
            },
            success: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
            },
            errorMessage: {
                type: DataTypes.TEXT,
            },
            metadata: {
                type: DataTypes.JSONB,
                defaultValue: {},
            },
            timestamp: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
            },
        },
        {
            tableName: 'agentTelemetry',
            timestamps: false,
        },
    )

    // ================================================
    // Agent Tool Logs
    // ================================================
    const agentToolLogs = sequelize.define(
        'agentToolLogs',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            requestId: {
                type: DataTypes.STRING(100),
                unique: true,
            },
            toolName: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            parameters: {
                type: DataTypes.JSONB,
                allowNull: false,
            },
            response: {
                type: DataTypes.JSONB,
            },
            statusCode: {
                type: DataTypes.INTEGER,
            },
            durationMs: {
                type: DataTypes.INTEGER,
            },
            agentId: {
                type: DataTypes.STRING(100),
            },
            conversationId: {
                type: DataTypes.UUID,
            },
            tenantId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            timestamp: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
            },
        },
        {
            tableName: 'agentToolLogs',
            timestamps: false,
        },
    )

    // ================================================
    // Agent Insights
    // ================================================
    const agentInsights = sequelize.define(
        'agentInsights',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            tenantId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            projectId: {
                type: DataTypes.UUID,
            },
            agentId: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            insightType: {
                type: DataTypes.STRING(50),
                allowNull: false,
            },
            severity: {
                type: DataTypes.STRING(20),
                allowNull: false,
            },
            title: {
                type: DataTypes.STRING(500),
                allowNull: false,
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            affectedEntities: {
                type: DataTypes.JSONB,
                defaultValue: [],
            },
            suggestedActions: {
                type: DataTypes.JSONB,
                defaultValue: [],
            },
            confidence: {
                type: DataTypes.DECIMAL(3, 2),
            },
            category: {
                type: DataTypes.STRING(50),
            },
            status: {
                type: DataTypes.STRING(20),
                defaultValue: 'active',
            },
            deduplicationKey: {
                type: DataTypes.STRING(255),
            },
            resolvedAt: {
                type: DataTypes.DATE,
            },
            resolvedBy: {
                type: DataTypes.UUID,
            },
            expiresAt: {
                type: DataTypes.DATE,
            },
        },
        {
            tableName: 'agentInsights',
            timestamps: true,
        },
    )

    // ================================================
    // Agent Feedback
    // ================================================
    const agentFeedback = sequelize.define(
        'agentFeedback',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            messageId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            userId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            tenantId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            agentId: {
                type: DataTypes.STRING(100),
            },
            rating: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            categories: {
                type: DataTypes.ARRAY(DataTypes.STRING(100)),
            },
            comment: {
                type: DataTypes.TEXT,
            },
        },
        {
            tableName: 'agentFeedback',
            timestamps: true,
            updatedAt: false,
        },
    )

    // ================================================
    // Insight Dismissals
    // ================================================
    const insightDismissals = sequelize.define(
        'insightDismissals',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            insightId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            userId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            reason: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            comment: {
                type: DataTypes.TEXT,
            },
        },
        {
            tableName: 'insightDismissals',
            timestamps: true,
            updatedAt: false,
        },
    )

    // ================================================
    // Conversation Memory
    // ================================================
    const conversationMemory = sequelize.define(
        'conversationMemory',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            conversationId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            summary: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            keyDecisions: {
                type: DataTypes.JSONB,
                defaultValue: [],
            },
            actionItems: {
                type: DataTypes.JSONB,
                defaultValue: [],
            },
            learnedFacts: {
                type: DataTypes.JSONB,
                defaultValue: [],
            },
        },
        {
            tableName: 'conversationMemory',
            timestamps: true,
        },
    )

    // ================================================
    // Insight Rate Limits
    // ================================================
    const insightRateLimits = sequelize.define(
        'insightRateLimits',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            tenantId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            projectId: {
                type: DataTypes.UUID,
            },
            agentId: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            insightCount: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
            },
            lastInsightAt: {
                type: DataTypes.DATE,
            },
            windowStart: {
                type: DataTypes.DATEONLY,
                allowNull: false,
            },
        },
        {
            tableName: 'insightRateLimits',
            timestamps: false,
            indexes: [
                {
                    unique: true,
                    fields: ['tenantId', 'projectId', 'agentId', 'windowStart'],
                },
            ],
        },
    )

    // ================================================
    // Define Associations
    // ================================================
    chatConversations.associate = (models) => {
        chatConversations.belongsTo(models.tenant, {
            as: 'tenant',
            foreignKey: 'tenantId',
        })
        chatConversations.belongsTo(models.user, {
            as: 'user',
            foreignKey: 'userId',
        })
        chatConversations.belongsTo(models.devtelProjects, {
            as: 'project',
            foreignKey: 'projectId',
        })
        chatConversations.hasMany(models.chatMessages, {
            as: 'messages',
            foreignKey: 'conversationId',
        })
        chatConversations.hasMany(models.chatActionProposals, {
            as: 'proposals',
            foreignKey: 'conversationId',
        })
        chatConversations.hasMany(models.conversationMemory, {
            as: 'memories',
            foreignKey: 'conversationId',
        })
    }

    chatMessages.associate = (models) => {
        chatMessages.belongsTo(models.chatConversations, {
            as: 'conversation',
            foreignKey: 'conversationId',
        })
        chatMessages.belongsTo(models.chatMessages, {
            as: 'parentMessage',
            foreignKey: 'parentMessageId',
        })
        chatMessages.hasMany(models.chatMessages, {
            as: 'replies',
            foreignKey: 'parentMessageId',
        })
        chatMessages.hasMany(models.agentFeedback, {
            as: 'feedback',
            foreignKey: 'messageId',
        })
    }

    chatActionProposals.associate = (models) => {
        chatActionProposals.belongsTo(models.chatConversations, {
            as: 'conversation',
            foreignKey: 'conversationId',
        })
        chatActionProposals.belongsTo(models.chatMessages, {
            as: 'message',
            foreignKey: 'messageId',
        })
        chatActionProposals.belongsTo(models.user, {
            as: 'responder',
            foreignKey: 'respondedBy',
        })
        chatActionProposals.hasOne(models.chatExecutedActions, {
            as: 'execution',
            foreignKey: 'proposalId',
        })
    }

    chatExecutedActions.associate = (models) => {
        chatExecutedActions.belongsTo(models.chatActionProposals, {
            as: 'proposal',
            foreignKey: 'proposalId',
        })
        chatExecutedActions.belongsTo(models.chatConversations, {
            as: 'conversation',
            foreignKey: 'conversationId',
        })
        chatExecutedActions.belongsTo(models.user, {
            as: 'executor',
            foreignKey: 'executedBy',
        })
        chatExecutedActions.belongsTo(models.user, {
            as: 'reverter',
            foreignKey: 'revertedBy',
        })
    }

    agentInsights.associate = (models) => {
        agentInsights.belongsTo(models.tenant, {
            as: 'tenant',
            foreignKey: 'tenantId',
        })
        agentInsights.belongsTo(models.devtelProjects, {
            as: 'project',
            foreignKey: 'projectId',
        })
        agentInsights.belongsTo(models.user, {
            as: 'resolver',
            foreignKey: 'resolvedBy',
        })
        agentInsights.hasMany(models.insightDismissals, {
            as: 'dismissals',
            foreignKey: 'insightId',
        })
    }

    agentFeedback.associate = (models) => {
        agentFeedback.belongsTo(models.chatMessages, {
            as: 'message',
            foreignKey: 'messageId',
        })
        agentFeedback.belongsTo(models.user, {
            as: 'user',
            foreignKey: 'userId',
        })
    }

    insightDismissals.associate = (models) => {
        insightDismissals.belongsTo(models.agentInsights, {
            as: 'insight',
            foreignKey: 'insightId',
        })
        insightDismissals.belongsTo(models.user, {
            as: 'user',
            foreignKey: 'userId',
        })
    }

    conversationMemory.associate = (models) => {
        conversationMemory.belongsTo(models.chatConversations, {
            as: 'conversation',
            foreignKey: 'conversationId',
        })
    }

    // ================================================
    // Agent Configurations
    // ================================================
    const agentConfigurations = sequelize.define(
        'agentConfigurations',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            tenantId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            agentId: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            isActive: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
            },
            configuration: {
                type: DataTypes.JSONB,
                defaultValue: {},
            },
        },
        {
            tableName: 'agentConfigurations',
            timestamps: true,
            indexes: [
                {
                    unique: true,
                    fields: ['tenantId', 'agentId'],
                },
            ],
        },
    )

    agentConfigurations.associate = (models) => {
        agentConfigurations.belongsTo(models.tenant, {
            as: 'tenant',
            foreignKey: 'tenantId',
        })
    }

    // ================================================
    // Compliance Exports
    // ================================================
    const complianceExports = sequelize.define(
        'complianceExports',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            tenantId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            generatedBy: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            criteria: {
                type: DataTypes.JSONB,
                defaultValue: {},
            },
            signatureHash: {
                type: DataTypes.STRING(256),
                allowNull: false,
            },
            fileUrl: {
                type: DataTypes.TEXT,
            },
            format: {
                type: DataTypes.STRING(20),
                defaultValue: 'csv',
            },
            actionCount: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
            },
        },
        {
            tableName: 'complianceExports',
            timestamps: true,
            updatedAt: false,
        },
    )

    complianceExports.associate = (models) => {
        complianceExports.belongsTo(models.tenant, {
            as: 'tenant',
            foreignKey: 'tenantId',
        })
        complianceExports.belongsTo(models.user, {
            as: 'generator',
            foreignKey: 'generatedBy',
        })
    }

    // ================================================
    // Phase 8: New Models
    // ================================================
    const insightActions = sequelize.define(
        'insightActions',
        {
            id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            insightId: { type: DataTypes.UUID, allowNull: false },
            userId: { type: DataTypes.UUID },
            actionType: { type: DataTypes.STRING(50) },
        },
        { tableName: 'insightActions', timestamps: true, updatedAt: false, createdAt: 'executedAt' }
    )

    const notifications = sequelize.define(
        'notifications',
        {
            id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            tenantId: { type: DataTypes.UUID, allowNull: false },
            recipientId: { type: DataTypes.UUID },
            type: { type: DataTypes.STRING(50), allowNull: false },
            title: { type: DataTypes.STRING(255), allowNull: false },
            message: { type: DataTypes.TEXT },
            meta: { type: DataTypes.JSONB, defaultValue: {} },
            isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
        },
        { tableName: 'notifications', timestamps: true, updatedAt: false }
    )

    insightActions.associate = (models) => {
        insightActions.belongsTo(models.agentInsights, { as: 'insight', foreignKey: 'insightId' })
        insightActions.belongsTo(models.user, { as: 'user', foreignKey: 'userId' })
    }

    notifications.associate = (models) => {
        notifications.belongsTo(models.tenant, { as: 'tenant', foreignKey: 'tenantId' })
        notifications.belongsTo(models.user, { as: 'recipient', foreignKey: 'recipientId' })
    }

    return {
        chatConversations,
        chatMessages,
        chatActionProposals,
        chatExecutedActions,
        agentTelemetry,
        agentToolLogs,
        agentInsights,
        agentFeedback,
        insightDismissals,
        conversationMemory,
        insightRateLimits,
        agentConfigurations,
        complianceExports,
        // New models
        notifications,
        insightActions,
    }
}
