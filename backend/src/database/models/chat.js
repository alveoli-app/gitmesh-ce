"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
/**
 * Chat Sequelize Models
 * Defines all Chat-related database models for AI command center
 */
exports.default = (sequelize) => {
    // ================================================
    // Chat Conversations
    // ================================================
    const chatConversations = sequelize.define('chatConversations', {
        id: {
            type: sequelize_1.DataTypes.UUID,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
            primaryKey: true,
        },
        tenantId: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        userId: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        projectId: {
            type: sequelize_1.DataTypes.UUID,
        },
        workspaceId: {
            type: sequelize_1.DataTypes.UUID,
        },
        title: {
            type: sequelize_1.DataTypes.STRING(500),
        },
        status: {
            type: sequelize_1.DataTypes.STRING(20),
            defaultValue: 'active',
        },
        context: {
            type: sequelize_1.DataTypes.JSONB,
            defaultValue: {},
        },
        metadata: {
            type: sequelize_1.DataTypes.JSONB,
            defaultValue: {},
        },
        lastMessageAt: {
            type: sequelize_1.DataTypes.DATE,
        },
        messageCount: {
            type: sequelize_1.DataTypes.INTEGER,
            defaultValue: 0,
        },
    }, {
        tableName: 'chatConversations',
        timestamps: true,
        paranoid: true,
    });
    // ================================================
    // Chat Messages
    // ================================================
    const chatMessages = sequelize.define('chatMessages', {
        id: {
            type: sequelize_1.DataTypes.UUID,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
            primaryKey: true,
        },
        conversationId: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        senderType: {
            type: sequelize_1.DataTypes.STRING(20),
            allowNull: false,
        },
        agentId: {
            type: sequelize_1.DataTypes.STRING(100),
        },
        content: {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: false,
        },
        contentType: {
            type: sequelize_1.DataTypes.STRING(50),
            defaultValue: 'text',
        },
        metadata: {
            type: sequelize_1.DataTypes.JSONB,
            defaultValue: {},
        },
        parentMessageId: {
            type: sequelize_1.DataTypes.UUID,
        },
        isStreaming: {
            type: sequelize_1.DataTypes.BOOLEAN,
            defaultValue: false,
        },
        streamCompletedAt: {
            type: sequelize_1.DataTypes.DATE,
        },
        tokensUsed: {
            type: sequelize_1.DataTypes.INTEGER,
        },
        durationMs: {
            type: sequelize_1.DataTypes.INTEGER,
        },
        feedbackRating: {
            type: sequelize_1.DataTypes.INTEGER,
        },
    }, {
        tableName: 'chatMessages',
        timestamps: true,
    });
    // ================================================
    // Chat Action Proposals
    // ================================================
    const chatActionProposals = sequelize.define('chatActionProposals', {
        id: {
            type: sequelize_1.DataTypes.UUID,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
            primaryKey: true,
        },
        conversationId: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        messageId: {
            type: sequelize_1.DataTypes.UUID,
        },
        agentId: {
            type: sequelize_1.DataTypes.STRING(100),
            allowNull: false,
        },
        actionType: {
            type: sequelize_1.DataTypes.STRING(100),
            allowNull: false,
        },
        parameters: {
            type: sequelize_1.DataTypes.JSONB,
            allowNull: false,
        },
        reasoning: {
            type: sequelize_1.DataTypes.TEXT,
        },
        affectedEntities: {
            type: sequelize_1.DataTypes.JSONB,
            defaultValue: [],
        },
        estimatedImpact: {
            type: sequelize_1.DataTypes.TEXT,
        },
        confidenceScore: {
            type: sequelize_1.DataTypes.DECIMAL(3, 2),
        },
        status: {
            type: sequelize_1.DataTypes.STRING(20),
            defaultValue: 'pending',
        },
        rejectionReason: {
            type: sequelize_1.DataTypes.TEXT,
        },
        modifiedProposalId: {
            type: sequelize_1.DataTypes.UUID,
        },
        expiresAt: {
            type: sequelize_1.DataTypes.DATE,
        },
        respondedAt: {
            type: sequelize_1.DataTypes.DATE,
        },
        respondedBy: {
            type: sequelize_1.DataTypes.UUID,
        },
        batchId: {
            type: sequelize_1.DataTypes.UUID,
        },
        batchOrder: {
            type: sequelize_1.DataTypes.INTEGER,
        },
    }, {
        tableName: 'chatActionProposals',
        timestamps: true,
    });
    // ================================================
    // Chat Executed Actions
    // ================================================
    const chatExecutedActions = sequelize.define('chatExecutedActions', {
        id: {
            type: sequelize_1.DataTypes.UUID,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
            primaryKey: true,
        },
        proposalId: {
            type: sequelize_1.DataTypes.UUID,
        },
        conversationId: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        tenantId: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        executedBy: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        agentId: {
            type: sequelize_1.DataTypes.STRING(100),
            allowNull: false,
        },
        actionType: {
            type: sequelize_1.DataTypes.STRING(100),
            allowNull: false,
        },
        parameters: {
            type: sequelize_1.DataTypes.JSONB,
            allowNull: false,
        },
        result: {
            type: sequelize_1.DataTypes.JSONB,
        },
        status: {
            type: sequelize_1.DataTypes.STRING(20),
            allowNull: false,
        },
        errorMessage: {
            type: sequelize_1.DataTypes.TEXT,
        },
        affectedEntityType: {
            type: sequelize_1.DataTypes.STRING(100),
        },
        affectedEntityId: {
            type: sequelize_1.DataTypes.UUID,
        },
        isReversible: {
            type: sequelize_1.DataTypes.BOOLEAN,
            defaultValue: false,
        },
        revertedAt: {
            type: sequelize_1.DataTypes.DATE,
        },
        revertedBy: {
            type: sequelize_1.DataTypes.UUID,
        },
        durationMs: {
            type: sequelize_1.DataTypes.INTEGER,
        },
    }, {
        tableName: 'chatExecutedActions',
        timestamps: true,
        updatedAt: false,
    });
    // ================================================
    // Agent Telemetry
    // ================================================
    const agentTelemetry = sequelize.define('agentTelemetry', {
        id: {
            type: sequelize_1.DataTypes.UUID,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
            primaryKey: true,
        },
        tenantId: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        agentName: {
            type: sequelize_1.DataTypes.STRING(100),
            allowNull: false,
        },
        taskType: {
            type: sequelize_1.DataTypes.STRING(100),
            allowNull: false,
        },
        durationMs: {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: false,
        },
        tokensUsed: {
            type: sequelize_1.DataTypes.INTEGER,
        },
        success: {
            type: sequelize_1.DataTypes.BOOLEAN,
            allowNull: false,
        },
        errorMessage: {
            type: sequelize_1.DataTypes.TEXT,
        },
        metadata: {
            type: sequelize_1.DataTypes.JSONB,
            defaultValue: {},
        },
        timestamp: {
            type: sequelize_1.DataTypes.DATE,
            defaultValue: sequelize_1.DataTypes.NOW,
        },
    }, {
        tableName: 'agentTelemetry',
        timestamps: false,
    });
    // ================================================
    // Agent Tool Logs
    // ================================================
    const agentToolLogs = sequelize.define('agentToolLogs', {
        id: {
            type: sequelize_1.DataTypes.UUID,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
            primaryKey: true,
        },
        requestId: {
            type: sequelize_1.DataTypes.STRING(100),
            unique: true,
        },
        toolName: {
            type: sequelize_1.DataTypes.STRING(100),
            allowNull: false,
        },
        parameters: {
            type: sequelize_1.DataTypes.JSONB,
            allowNull: false,
        },
        response: {
            type: sequelize_1.DataTypes.JSONB,
        },
        statusCode: {
            type: sequelize_1.DataTypes.INTEGER,
        },
        durationMs: {
            type: sequelize_1.DataTypes.INTEGER,
        },
        agentId: {
            type: sequelize_1.DataTypes.STRING(100),
        },
        conversationId: {
            type: sequelize_1.DataTypes.UUID,
        },
        tenantId: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        timestamp: {
            type: sequelize_1.DataTypes.DATE,
            defaultValue: sequelize_1.DataTypes.NOW,
        },
    }, {
        tableName: 'agentToolLogs',
        timestamps: false,
    });
    // ================================================
    // Agent Insights
    // ================================================
    const agentInsights = sequelize.define('agentInsights', {
        id: {
            type: sequelize_1.DataTypes.UUID,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
            primaryKey: true,
        },
        tenantId: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        projectId: {
            type: sequelize_1.DataTypes.UUID,
        },
        agentId: {
            type: sequelize_1.DataTypes.STRING(100),
            allowNull: false,
        },
        insightType: {
            type: sequelize_1.DataTypes.STRING(50),
            allowNull: false,
        },
        severity: {
            type: sequelize_1.DataTypes.STRING(20),
            allowNull: false,
        },
        title: {
            type: sequelize_1.DataTypes.STRING(500),
            allowNull: false,
        },
        description: {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: false,
        },
        affectedEntities: {
            type: sequelize_1.DataTypes.JSONB,
            defaultValue: [],
        },
        suggestedActions: {
            type: sequelize_1.DataTypes.JSONB,
            defaultValue: [],
        },
        confidence: {
            type: sequelize_1.DataTypes.DECIMAL(3, 2),
        },
        category: {
            type: sequelize_1.DataTypes.STRING(50),
        },
        status: {
            type: sequelize_1.DataTypes.STRING(20),
            defaultValue: 'active',
        },
        deduplicationKey: {
            type: sequelize_1.DataTypes.STRING(255),
        },
        resolvedAt: {
            type: sequelize_1.DataTypes.DATE,
        },
        resolvedBy: {
            type: sequelize_1.DataTypes.UUID,
        },
        expiresAt: {
            type: sequelize_1.DataTypes.DATE,
        },
    }, {
        tableName: 'agentInsights',
        timestamps: true,
    });
    // ================================================
    // Agent Feedback
    // ================================================
    const agentFeedback = sequelize.define('agentFeedback', {
        id: {
            type: sequelize_1.DataTypes.UUID,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
            primaryKey: true,
        },
        messageId: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        userId: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        tenantId: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        agentId: {
            type: sequelize_1.DataTypes.STRING(100),
        },
        rating: {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: false,
        },
        categories: {
            type: sequelize_1.DataTypes.ARRAY(sequelize_1.DataTypes.STRING(100)),
        },
        comment: {
            type: sequelize_1.DataTypes.TEXT,
        },
    }, {
        tableName: 'agentFeedback',
        timestamps: true,
        updatedAt: false,
    });
    // ================================================
    // Insight Dismissals
    // ================================================
    const insightDismissals = sequelize.define('insightDismissals', {
        id: {
            type: sequelize_1.DataTypes.UUID,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
            primaryKey: true,
        },
        insightId: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        userId: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        reason: {
            type: sequelize_1.DataTypes.STRING(100),
            allowNull: false,
        },
        comment: {
            type: sequelize_1.DataTypes.TEXT,
        },
    }, {
        tableName: 'insightDismissals',
        timestamps: true,
        updatedAt: false,
    });
    // ================================================
    // Conversation Memory
    // ================================================
    const conversationMemory = sequelize.define('conversationMemory', {
        id: {
            type: sequelize_1.DataTypes.UUID,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
            primaryKey: true,
        },
        conversationId: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        summary: {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: false,
        },
        keyDecisions: {
            type: sequelize_1.DataTypes.JSONB,
            defaultValue: [],
        },
        actionItems: {
            type: sequelize_1.DataTypes.JSONB,
            defaultValue: [],
        },
        learnedFacts: {
            type: sequelize_1.DataTypes.JSONB,
            defaultValue: [],
        },
    }, {
        tableName: 'conversationMemory',
        timestamps: true,
    });
    // ================================================
    // Insight Rate Limits
    // ================================================
    const insightRateLimits = sequelize.define('insightRateLimits', {
        id: {
            type: sequelize_1.DataTypes.UUID,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
            primaryKey: true,
        },
        tenantId: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        projectId: {
            type: sequelize_1.DataTypes.UUID,
        },
        agentId: {
            type: sequelize_1.DataTypes.STRING(100),
            allowNull: false,
        },
        insightCount: {
            type: sequelize_1.DataTypes.INTEGER,
            defaultValue: 0,
        },
        lastInsightAt: {
            type: sequelize_1.DataTypes.DATE,
        },
        windowStart: {
            type: sequelize_1.DataTypes.DATEONLY,
            allowNull: false,
        },
    }, {
        tableName: 'insightRateLimits',
        timestamps: false,
        indexes: [
            {
                unique: true,
                fields: ['tenantId', 'projectId', 'agentId', 'windowStart'],
            },
        ],
    });
    // ================================================
    // Define Associations
    // ================================================
    chatConversations.associate = (models) => {
        chatConversations.belongsTo(models.tenant, {
            as: 'tenant',
            foreignKey: 'tenantId',
        });
        chatConversations.belongsTo(models.user, {
            as: 'user',
            foreignKey: 'userId',
        });
        chatConversations.belongsTo(models.devtelProjects, {
            as: 'project',
            foreignKey: 'projectId',
        });
        chatConversations.hasMany(models.chatMessages, {
            as: 'messages',
            foreignKey: 'conversationId',
        });
        chatConversations.hasMany(models.chatActionProposals, {
            as: 'proposals',
            foreignKey: 'conversationId',
        });
        chatConversations.hasMany(models.conversationMemory, {
            as: 'memories',
            foreignKey: 'conversationId',
        });
    };
    chatMessages.associate = (models) => {
        chatMessages.belongsTo(models.chatConversations, {
            as: 'conversation',
            foreignKey: 'conversationId',
        });
        chatMessages.belongsTo(models.chatMessages, {
            as: 'parentMessage',
            foreignKey: 'parentMessageId',
        });
        chatMessages.hasMany(models.chatMessages, {
            as: 'replies',
            foreignKey: 'parentMessageId',
        });
        chatMessages.hasMany(models.agentFeedback, {
            as: 'feedback',
            foreignKey: 'messageId',
        });
    };
    chatActionProposals.associate = (models) => {
        chatActionProposals.belongsTo(models.chatConversations, {
            as: 'conversation',
            foreignKey: 'conversationId',
        });
        chatActionProposals.belongsTo(models.chatMessages, {
            as: 'message',
            foreignKey: 'messageId',
        });
        chatActionProposals.belongsTo(models.user, {
            as: 'responder',
            foreignKey: 'respondedBy',
        });
        chatActionProposals.hasOne(models.chatExecutedActions, {
            as: 'execution',
            foreignKey: 'proposalId',
        });
    };
    chatExecutedActions.associate = (models) => {
        chatExecutedActions.belongsTo(models.chatActionProposals, {
            as: 'proposal',
            foreignKey: 'proposalId',
        });
        chatExecutedActions.belongsTo(models.chatConversations, {
            as: 'conversation',
            foreignKey: 'conversationId',
        });
        chatExecutedActions.belongsTo(models.user, {
            as: 'executor',
            foreignKey: 'executedBy',
        });
        chatExecutedActions.belongsTo(models.user, {
            as: 'reverter',
            foreignKey: 'revertedBy',
        });
    };
    agentInsights.associate = (models) => {
        agentInsights.belongsTo(models.tenant, {
            as: 'tenant',
            foreignKey: 'tenantId',
        });
        agentInsights.belongsTo(models.devtelProjects, {
            as: 'project',
            foreignKey: 'projectId',
        });
        agentInsights.belongsTo(models.user, {
            as: 'resolver',
            foreignKey: 'resolvedBy',
        });
        agentInsights.hasMany(models.insightDismissals, {
            as: 'dismissals',
            foreignKey: 'insightId',
        });
    };
    agentFeedback.associate = (models) => {
        agentFeedback.belongsTo(models.chatMessages, {
            as: 'message',
            foreignKey: 'messageId',
        });
        agentFeedback.belongsTo(models.user, {
            as: 'user',
            foreignKey: 'userId',
        });
    };
    insightDismissals.associate = (models) => {
        insightDismissals.belongsTo(models.agentInsights, {
            as: 'insight',
            foreignKey: 'insightId',
        });
        insightDismissals.belongsTo(models.user, {
            as: 'user',
            foreignKey: 'userId',
        });
    };
    conversationMemory.associate = (models) => {
        conversationMemory.belongsTo(models.chatConversations, {
            as: 'conversation',
            foreignKey: 'conversationId',
        });
    };
    // ================================================
    // Agent Configurations
    // ================================================
    const agentConfigurations = sequelize.define('agentConfigurations', {
        id: {
            type: sequelize_1.DataTypes.UUID,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
            primaryKey: true,
        },
        tenantId: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        agentId: {
            type: sequelize_1.DataTypes.STRING(100),
            allowNull: false,
        },
        isActive: {
            type: sequelize_1.DataTypes.BOOLEAN,
            defaultValue: true,
        },
        configuration: {
            type: sequelize_1.DataTypes.JSONB,
            defaultValue: {},
        },
    }, {
        tableName: 'agentConfigurations',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['tenantId', 'agentId'],
            },
        ],
    });
    agentConfigurations.associate = (models) => {
        agentConfigurations.belongsTo(models.tenant, {
            as: 'tenant',
            foreignKey: 'tenantId',
        });
    };
    // ================================================
    // Compliance Exports
    // ================================================
    const complianceExports = sequelize.define('complianceExports', {
        id: {
            type: sequelize_1.DataTypes.UUID,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
            primaryKey: true,
        },
        tenantId: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        generatedBy: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        criteria: {
            type: sequelize_1.DataTypes.JSONB,
            defaultValue: {},
        },
        signatureHash: {
            type: sequelize_1.DataTypes.STRING(256),
            allowNull: false,
        },
        fileUrl: {
            type: sequelize_1.DataTypes.TEXT,
        },
        format: {
            type: sequelize_1.DataTypes.STRING(20),
            defaultValue: 'csv',
        },
        actionCount: {
            type: sequelize_1.DataTypes.INTEGER,
            defaultValue: 0,
        },
    }, {
        tableName: 'complianceExports',
        timestamps: true,
        updatedAt: false,
    });
    complianceExports.associate = (models) => {
        complianceExports.belongsTo(models.tenant, {
            as: 'tenant',
            foreignKey: 'tenantId',
        });
        complianceExports.belongsTo(models.user, {
            as: 'generator',
            foreignKey: 'generatedBy',
        });
    };
    // ================================================
    // Phase 8: New Models
    // ================================================
    const insightActions = sequelize.define('insightActions', {
        id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        insightId: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        userId: { type: sequelize_1.DataTypes.UUID },
        actionType: { type: sequelize_1.DataTypes.STRING(50) },
    }, { tableName: 'insightActions', timestamps: true, updatedAt: false, createdAt: 'executedAt' });
    const notifications = sequelize.define('notifications', {
        id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        tenantId: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        recipientId: { type: sequelize_1.DataTypes.UUID },
        type: { type: sequelize_1.DataTypes.STRING(50), allowNull: false },
        title: { type: sequelize_1.DataTypes.STRING(255), allowNull: false },
        message: { type: sequelize_1.DataTypes.TEXT },
        meta: { type: sequelize_1.DataTypes.JSONB, defaultValue: {} },
        isRead: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: false },
    }, { tableName: 'notifications', timestamps: true, updatedAt: false });
    insightActions.associate = (models) => {
        insightActions.belongsTo(models.agentInsights, { as: 'insight', foreignKey: 'insightId' });
        insightActions.belongsTo(models.user, { as: 'user', foreignKey: 'userId' });
    };
    notifications.associate = (models) => {
        notifications.belongsTo(models.tenant, { as: 'tenant', foreignKey: 'tenantId' });
        notifications.belongsTo(models.user, { as: 'recipient', foreignKey: 'recipientId' });
    };
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
    };
};
//# sourceMappingURL=chat.js.map