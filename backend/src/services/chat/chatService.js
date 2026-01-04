"use strict";
/**
 * Chat Service - Core service for AI Chat functionality
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logging_1 = require("@gitmesh/logging");
const axios_1 = __importDefault(require("axios"));
const CREWAI_URL = process.env.CREWAI_SERVICE_URL || 'http://localhost:8001';
const CREWAI_TOKEN = process.env.CREWAI_SERVICE_TOKEN || 'dev-token';
class ChatService extends logging_1.LoggerBase {
    constructor(options) {
        super(options.log);
        this.options = options;
        this.crewaiClient = axios_1.default.create({
            baseURL: CREWAI_URL,
            timeout: 120000,
            headers: {
                'X-Service-Token': CREWAI_TOKEN,
                'Content-Type': 'application/json',
            },
        });
    }
    // ========================================
    // Conversation Management
    // ========================================
    /**
     * List conversations for current user
     */
    async listConversations(filters = {}) {
        const { status = 'active', projectId, limit = 50, offset = 0 } = filters;
        const where = {
            userId: this.options.currentUser.id,
            tenantId: this.options.currentTenant.id,
        };
        if (status) {
            where.status = status;
        }
        if (projectId) {
            where.projectId = projectId;
        }
        const conversations = await this.options.database.chatConversations.findAndCountAll({
            where,
            order: [['lastMessageAt', 'DESC NULLS LAST'], ['createdAt', 'DESC']],
            limit,
            offset,
        });
        return {
            rows: conversations.rows.map((c) => c.get({ plain: true })),
            count: conversations.count,
        };
    }
    /**
     * Create a new conversation
     */
    async createConversation(data) {
        // Get workspace ID from project or from active workspace
        let workspaceId = null;
        if (data.projectId) {
            const project = await this.options.database.devtelProjects.findByPk(data.projectId);
            if (project) {
                workspaceId = project.workspaceId;
            }
        }
        const conversation = await this.options.database.chatConversations.create({
            tenantId: this.options.currentTenant.id,
            userId: this.options.currentUser.id,
            projectId: data.projectId || null,
            workspaceId,
            title: data.title || null,
            context: data.context || {},
            status: 'active',
            messageCount: 0,
        });
        return conversation.get({ plain: true });
    }
    /**
     * Get a conversation with its messages
     */
    async getConversation(conversationId, includeMessages = true) {
        const conversation = await this.options.database.chatConversations.findOne({
            where: {
                id: conversationId,
                userId: this.options.currentUser.id,
                deletedAt: null,
            },
        });
        if (!conversation) {
            throw new Error('Conversation not found');
        }
        const result = conversation.get({ plain: true });
        if (includeMessages) {
            const messages = await this.options.database.chatMessages.findAll({
                where: { conversationId },
                order: [['createdAt', 'ASC']],
            });
            result.messages = messages.map((m) => m.get({ plain: true }));
        }
        return result;
    }
    /**
     * Update a conversation (rename, update context)
     */
    async updateConversation(conversationId, data) {
        const conversation = await this.options.database.chatConversations.findOne({
            where: {
                id: conversationId,
                userId: this.options.currentUser.id,
                deletedAt: null,
            },
        });
        if (!conversation) {
            throw new Error('Conversation not found');
        }
        await conversation.update(Object.assign(Object.assign(Object.assign({}, (data.title !== undefined && { title: data.title })), (data.context !== undefined && { context: data.context })), (data.status !== undefined && { status: data.status })));
        return conversation.get({ plain: true });
    }
    /**
     * Delete (archive) a conversation
     */
    async deleteConversation(conversationId) {
        const conversation = await this.options.database.chatConversations.findOne({
            where: {
                id: conversationId,
                userId: this.options.currentUser.id,
                deletedAt: null,
            },
        });
        if (!conversation) {
            throw new Error('Conversation not found');
        }
        await conversation.update({ status: 'archived' });
        await conversation.destroy(); // Soft delete
        return { success: true };
    }
    // ========================================
    // Message Management
    // ========================================
    /**
     * Send a message and trigger agent processing
     */
    async sendMessage(data) {
        const { conversationId, content, mentionedEntities = [] } = data;
        // Verify conversation access
        const conversation = await this.options.database.chatConversations.findOne({
            where: {
                id: conversationId,
                userId: this.options.currentUser.id,
                deletedAt: null,
            },
        });
        if (!conversation) {
            throw new Error('Conversation not found');
        }
        // Create user message
        const userMessage = await this.options.database.chatMessages.create({
            conversationId,
            senderType: 'user',
            content,
            contentType: 'text',
            metadata: {
                mentionedEntities,
            },
        });
        // Update conversation stats
        await conversation.update({
            lastMessageAt: new Date(),
            messageCount: conversation.messageCount + 1,
        });
        // Generate title if this is the first message
        if (conversation.messageCount === 0 && !conversation.title) {
            this.generateConversationTitle(conversationId, content).catch(e => {
                this.log.warn('Failed to generate conversation title:', e);
            });
        }
        // Create placeholder for agent response
        const agentMessage = await this.options.database.chatMessages.create({
            conversationId,
            senderType: 'agent',
            content: '',
            contentType: 'markdown',
            isStreaming: true,
            metadata: {},
        });
        // Trigger agent processing asynchronously
        this.processWithAgent(conversation, userMessage, agentMessage).catch(e => {
            this.log.error('Agent processing failed:', e);
            this.handleAgentError(agentMessage.id, e.message);
        });
        return {
            userMessage: userMessage.get({ plain: true }),
            agentMessage: agentMessage.get({ plain: true }),
        };
    }
    /**
     * Get messages for a conversation
     */
    async getMessages(conversationId, options = {}) {
        const { limit = 100, before, after } = options;
        // Verify access
        const conversation = await this.options.database.chatConversations.findOne({
            where: {
                id: conversationId,
                userId: this.options.currentUser.id,
                deletedAt: null,
            },
        });
        if (!conversation) {
            throw new Error('Conversation not found');
        }
        const where = { conversationId };
        if (before) {
            where.createdAt = { [this.options.database.Sequelize.Op.lt]: before };
        }
        if (after) {
            where.createdAt = { [this.options.database.Sequelize.Op.gt]: after };
        }
        const messages = await this.options.database.chatMessages.findAll({
            where,
            order: [['createdAt', 'ASC']],
            limit,
        });
        return messages.map((m) => m.get({ plain: true }));
    }
    // ========================================
    // Action Proposals
    // ========================================
    /**
     * Create an action proposal
     */
    async createProposal(data) {
        const proposal = await this.options.database.chatActionProposals.create({
            conversationId: data.conversationId,
            agentId: data.agentId,
            actionType: data.actionType,
            parameters: data.parameters,
            reasoning: data.reasoning,
            affectedEntities: data.affectedEntities || [],
            confidenceScore: data.confidenceScore,
            status: 'pending',
            expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        });
        return proposal.get({ plain: true });
    }
    /**
     * Get pending proposals for a conversation
     */
    async getPendingProposals(conversationId) {
        const proposals = await this.options.database.chatActionProposals.findAll({
            where: {
                conversationId,
                status: 'pending',
            },
            order: [['createdAt', 'DESC']],
        });
        return proposals.map((p) => p.get({ plain: true }));
    }
    /**
     * Approve and execute a proposal
     */
    async approveProposal(proposalId) {
        const proposal = await this.options.database.chatActionProposals.findOne({
            where: {
                id: proposalId,
                status: 'pending',
            },
        });
        if (!proposal) {
            throw new Error('Proposal not found or already processed');
        }
        // Verify user has access to the conversation
        const conversation = await this.options.database.chatConversations.findOne({
            where: {
                id: proposal.conversationId,
                userId: this.options.currentUser.id,
            },
        });
        if (!conversation) {
            throw new Error('Access denied');
        }
        // Execute the action
        const startTime = Date.now();
        let result;
        let status = 'success';
        let errorMessage = null;
        try {
            result = await this.executeAction(proposal.actionType, proposal.parameters);
        }
        catch (e) {
            status = 'failed';
            errorMessage = e.message;
            result = { error: e.message };
        }
        // Update proposal
        await proposal.update({
            status: 'approved',
            respondedAt: new Date(),
            respondedBy: this.options.currentUser.id,
        });
        // Log the execution
        const executedAction = await this.options.database.chatExecutedActions.create({
            proposalId: proposal.id,
            conversationId: proposal.conversationId,
            tenantId: this.options.currentTenant.id,
            executedBy: this.options.currentUser.id,
            agentId: proposal.agentId,
            actionType: proposal.actionType,
            parameters: proposal.parameters,
            result,
            status,
            errorMessage,
            durationMs: Date.now() - startTime,
            isReversible: this.isActionReversible(proposal.actionType),
        });
        // Extract affected entity from result
        if (result && result.id) {
            await executedAction.update({
                affectedEntityType: proposal.actionType.split('_')[0], // e.g., 'issue' from 'issue_create'
                affectedEntityId: result.id,
            });
        }
        return {
            proposal: proposal.get({ plain: true }),
            execution: executedAction.get({ plain: true }),
        };
    }
    /**
     * Reject a proposal
     */
    async rejectProposal(proposalId, reason) {
        const proposal = await this.options.database.chatActionProposals.findOne({
            where: {
                id: proposalId,
                status: 'pending',
            },
        });
        if (!proposal) {
            throw new Error('Proposal not found or already processed');
        }
        // Verify user has access
        const conversation = await this.options.database.chatConversations.findOne({
            where: {
                id: proposal.conversationId,
                userId: this.options.currentUser.id,
            },
        });
        if (!conversation) {
            throw new Error('Access denied');
        }
        await proposal.update({
            status: 'rejected',
            rejectionReason: reason || null,
            respondedAt: new Date(),
            respondedBy: this.options.currentUser.id,
        });
        return proposal.get({ plain: true });
    }
    // ========================================
    // Agent Feedback
    // ========================================
    /**
     * Submit feedback for an agent message
     */
    async submitFeedback(messageId, data) {
        const message = await this.options.database.chatMessages.findByPk(messageId);
        if (!message || message.senderType !== 'agent') {
            throw new Error('Agent message not found');
        }
        // Verify user has access to the conversation
        const conversation = await this.options.database.chatConversations.findOne({
            where: {
                id: message.conversationId,
                userId: this.options.currentUser.id,
            },
        });
        if (!conversation) {
            throw new Error('Access denied');
        }
        const feedback = await this.options.database.agentFeedback.create({
            messageId,
            userId: this.options.currentUser.id,
            tenantId: this.options.currentTenant.id,
            agentId: message.agentId,
            rating: data.rating,
            categories: data.categories || [],
            comment: data.comment || null,
        });
        // Update message with rating
        await message.update({ feedbackRating: data.rating });
        return feedback.get({ plain: true });
    }
    // ========================================
    // Private Helper Methods
    // ========================================
    /**
     * Process message with CrewAI agent
     */
    async processWithAgent(conversation, userMessage, agentMessage) {
        var _a;
        const startTime = Date.now();
        try {
            // Build context for the agent
            const context = await this.buildContext(conversation, userMessage);
            // Fetch agent configurations for dynamic tools
            const agentConfigs = await this.options.database.agentConfigurations.findAll({
                where: {
                    tenantId: this.options.currentTenant.id,
                    isActive: true,
                },
                attributes: ['agentId', 'configuration'],
            });
            const agentToolSets = {};
            for (const config of agentConfigs) {
                if ((_a = config.configuration) === null || _a === void 0 ? void 0 : _a.allowedToolSets) {
                    agentToolSets[config.agentId] = config.configuration.allowedToolSets;
                }
            }
            // Call CrewAI service
            const response = await this.crewaiClient.post('/chat/process', {
                conversationId: conversation.id,
                messageId: userMessage.id,
                content: userMessage.content,
                context,
                userId: this.options.currentUser.id,
                tenantId: this.options.currentTenant.id,
                agentToolSets,
            });
            const { content, agentId, proposals = [], tokensUsed } = response.data;
            // Update agent message
            await agentMessage.update({
                content,
                agentId,
                isStreaming: false,
                streamCompletedAt: new Date(),
                tokensUsed,
                durationMs: Date.now() - startTime,
                metadata: {
                    proposalIds: proposals.map((p) => p.id),
                },
            });
            // Create proposals if any
            for (const proposalData of proposals) {
                await this.createProposal(Object.assign({ conversationId: conversation.id, messageId: agentMessage.id }, proposalData));
            }
            // Update conversation message count
            await conversation.update({
                messageCount: conversation.messageCount + 1,
            });
            // Log telemetry
            await this.options.database.agentTelemetry.create({
                tenantId: this.options.currentTenant.id,
                agentName: agentId || 'chat-agent',
                taskType: 'chat_response',
                durationMs: Date.now() - startTime,
                tokensUsed,
                success: true,
                metadata: {
                    conversationId: conversation.id,
                    messageId: userMessage.id,
                },
            });
            // Trigger proactive summarization if message count allows
            // Every 10 messages seems reasonable interval
            if (conversation.messageCount > 0 && conversation.messageCount % 10 === 0) {
                this.summarizeConversation(conversation.id).catch(e => {
                    this.log.warn('Background summarization failed:', e);
                });
            }
        }
        catch (error) {
            this.log.error('Failed to process with agent:', error);
            // Log failed telemetry
            await this.options.database.agentTelemetry.create({
                tenantId: this.options.currentTenant.id,
                agentName: 'chat-agent',
                taskType: 'chat_response',
                durationMs: Date.now() - startTime,
                success: false,
                errorMessage: error.message,
                metadata: {
                    conversationId: conversation.id,
                    messageId: userMessage.id,
                },
            });
            throw error;
        }
    }
    /**
     * Build context for agent processing
     */
    async buildContext(conversation, userMessage) {
        var _a, _b;
        const context = {
            conversation: {
                id: conversation.id,
                title: conversation.title,
                context: conversation.context,
            },
            user: {
                id: this.options.currentUser.id,
                name: this.options.currentUser.fullName,
            },
        };
        // Add project context if conversation is scoped
        if (conversation.projectId) {
            const project = await this.options.database.devtelProjects.findByPk(conversation.projectId, {
                include: [
                    { model: this.options.database.user, as: 'lead' },
                ],
            });
            if (project) {
                context.project = {
                    id: project.id,
                    name: project.name,
                    description: project.description,
                    lead: (_a = project.lead) === null || _a === void 0 ? void 0 : _a.fullName,
                };
            }
        }
        // Parse mentioned entities from user message
        const mentionedEntities = ((_b = userMessage.metadata) === null || _b === void 0 ? void 0 : _b.mentionedEntities) || [];
        if (mentionedEntities.length > 0) {
            context.mentionedEntities = await this.loadMentionedEntities(mentionedEntities);
        }
        // Inject Conversation Memory (Summarization)
        const memory = await this.options.database.conversationMemory.findOne({
            where: { conversationId: conversation.id },
            order: [['createdAt', 'DESC']],
        });
        if (memory) {
            context.memory = {
                summary: memory.summary,
                keyDecisions: memory.keyDecisions,
                actionItems: memory.actionItems,
            };
        }
        // Get recent conversation messages for memory
        // We limit to 20 messages now that we have summarization
        const recentMessages = await this.options.database.chatMessages.findAll({
            where: { conversationId: conversation.id },
            order: [['createdAt', 'DESC']],
            limit: 20,
        });
        context.recentMessages = recentMessages.reverse().map((m) => ({
            role: m.senderType === 'user' ? 'user' : 'assistant',
            content: m.content,
        }));
        return context;
    }
    /**
     * Trigger conversation summarization
     */
    async summarizeConversation(conversationId) {
        try {
            // Fetch last 50 messages to summarize
            const messages = await this.options.database.chatMessages.findAll({
                where: { conversationId },
                order: [['createdAt', 'ASC']], // Oldest to newest for correct context
                limit: 50,
            });
            if (messages.length < 10)
                return; // Not enough to summarize
            const transcript = messages.map((m) => ({
                role: m.senderType === 'user' ? 'user' : 'assistant',
                content: m.content,
            }));
            // Call Python Orchestrator
            const response = await this.crewaiClient.post('/agents/summarize', {
                messages: transcript,
            });
            const summaryText = response.data.summary;
            if (summaryText) {
                // Update memory table
                await this.options.database.conversationMemory.create({
                    conversationId,
                    summary: summaryText,
                    keyDecisions: [], // Could be extracted too if agent returns JSON
                    actionItems: [],
                });
                this.log.info(`[ConversationMemory] Updated summary for ${conversationId}`);
            }
        }
        catch (error) {
            this.log.warn('[ConversationMemory] Failed to summarize:', error);
        }
    }
    /**
     * Load full details for mentioned entities
     */
    async loadMentionedEntities(entities) {
        var _a;
        const loaded = [];
        for (const entity of entities) {
            try {
                if (entity.type === 'issue') {
                    const issue = await this.options.database.devtelIssues.findByPk(entity.id);
                    if (issue) {
                        loaded.push({
                            type: 'issue',
                            id: issue.id,
                            title: issue.title,
                            status: issue.status,
                            priority: issue.priority,
                            description: (_a = issue.description) === null || _a === void 0 ? void 0 : _a.substring(0, 500),
                        });
                    }
                }
                else if (entity.type === 'user') {
                    const user = await this.options.database.user.findByPk(entity.id);
                    if (user) {
                        loaded.push({
                            type: 'user',
                            id: user.id,
                            name: user.fullName,
                            email: user.email,
                        });
                    }
                }
                else if (entity.type === 'cycle') {
                    const cycle = await this.options.database.devtelCycles.findByPk(entity.id);
                    if (cycle) {
                        loaded.push({
                            type: 'cycle',
                            id: cycle.id,
                            name: cycle.name,
                            status: cycle.status,
                            startDate: cycle.startDate,
                            endDate: cycle.endDate,
                        });
                    }
                }
            }
            catch (e) {
                this.log.warn(`Failed to load entity ${entity.type}:${entity.id}:`, e);
            }
        }
        return loaded;
    }
    /**
     * Execute an action based on type
     */
    async executeAction(actionType, parameters) {
        switch (actionType) {
            case 'create_issue':
                return this.executeCreateIssue(parameters);
            case 'update_issue':
                return this.executeUpdateIssue(parameters);
            case 'assign_issue':
                return this.executeAssignIssue(parameters);
            case 'create_spec':
                return this.executeCreateSpec(parameters);
            default:
                throw new Error(`Unknown action type: ${actionType}`);
        }
    }
    async executeCreateIssue(params) {
        const issue = await this.options.database.devtelIssues.create({
            projectId: params.projectId,
            title: params.title,
            description: params.description,
            priority: params.priority || 'medium',
            status: params.status || 'backlog',
            assigneeId: params.assigneeId,
            estimatedHours: params.estimatedHours,
            storyPoints: params.storyPoints,
            createdById: this.options.currentUser.id,
        });
        return issue.get({ plain: true });
    }
    async executeUpdateIssue(params) {
        const issue = await this.options.database.devtelIssues.findByPk(params.issueId);
        if (!issue)
            throw new Error('Issue not found');
        await issue.update(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (params.title && { title: params.title })), (params.description !== undefined && { description: params.description })), (params.priority && { priority: params.priority })), (params.status && { status: params.status })), (params.assigneeId !== undefined && { assigneeId: params.assigneeId })), (params.estimatedHours !== undefined && { estimatedHours: params.estimatedHours })), { updatedById: this.options.currentUser.id }));
        return issue.get({ plain: true });
    }
    async executeAssignIssue(params) {
        const issue = await this.options.database.devtelIssues.findByPk(params.issueId);
        if (!issue)
            throw new Error('Issue not found');
        await issue.update({
            assigneeId: params.assigneeId,
            updatedById: this.options.currentUser.id,
        });
        return issue.get({ plain: true });
    }
    async executeCreateSpec(params) {
        const spec = await this.options.database.devtelSpecDocuments.create({
            projectId: params.projectId,
            title: params.title,
            content: params.content,
            status: 'draft',
            authorId: this.options.currentUser.id,
            createdById: this.options.currentUser.id,
        });
        return spec.get({ plain: true });
    }
    /**
     * Check if an action type is reversible
     */
    isActionReversible(actionType) {
        const reversibleActions = ['assign_issue', 'update_issue'];
        return reversibleActions.includes(actionType);
    }
    /**
     * Handle agent processing error
     */
    async handleAgentError(messageId, errorMessage) {
        try {
            await this.options.database.chatMessages.update({
                content: `I apologize, but I encountered an error while processing your request: ${errorMessage}\n\nPlease try again or rephrase your question.`,
                isStreaming: false,
                streamCompletedAt: new Date(),
                metadata: { error: true, errorMessage },
            }, { where: { id: messageId } });
        }
        catch (e) {
            this.log.error('Failed to update error message:', e);
        }
    }
    /**
     * Generate a title for a conversation based on first message
     */
    async generateConversationTitle(conversationId, firstMessage) {
        var _a;
        try {
            const response = await this.crewaiClient.post('/chat/generate-title', {
                message: firstMessage,
            });
            if ((_a = response.data) === null || _a === void 0 ? void 0 : _a.title) {
                await this.options.database.chatConversations.update({ title: response.data.title }, { where: { id: conversationId } });
            }
        }
        catch (e) {
            // Use first few words as fallback
            const fallbackTitle = firstMessage.substring(0, 50).trim() + (firstMessage.length > 50 ? '...' : '');
            await this.options.database.chatConversations.update({ title: fallbackTitle }, { where: { id: conversationId } });
        }
    }
}
exports.default = ChatService;
//# sourceMappingURL=chatService.js.map