/**
 * Context Builder - Modular context injection system for agent processing
 * Gathers relevant data from registered providers with a token budget
 */

import { LoggerBase } from '@gitmesh/logging'
import { IServiceOptions } from '../IServiceOptions'
import { ContextConfig, IContextProvider } from './contextProviders/IContextProvider'
import { DevSpaceContextProvider } from './contextProviders/DevSpaceContextProvider'

const MAX_TOKEN_BUDGET = 6000
const TOKENS_PER_CHAR = 0.25

interface EntityReference {
    type: 'issue' | 'user' | 'cycle' | 'spec'
    id: string
}

interface BuiltContext {
    [key: string]: any
    tokenCount: number
}

export default class ContextBuilder extends LoggerBase {
    options: IServiceOptions
    tokenBudget: number
    currentTokens: number
    context: BuiltContext
    providers: IContextProvider[]

    constructor(options: IServiceOptions, tokenBudget: number = MAX_TOKEN_BUDGET) {
        super(options.log)
        this.options = options
        this.tokenBudget = tokenBudget
        this.currentTokens = 0
        this.context = { tokenCount: 0 }

        // Register Providers (Priority Order)
        this.providers = [
            new DevSpaceContextProvider(options.log)
            // Future: new SignalsContextProvider(options.log)
        ]
    }

    /**
     * Build full context for a conversation
     */
    async buildForConversation(
        conversationId: string,
        config: ContextConfig = {}
    ): Promise<BuiltContext> {
        try {
            const conversation = await this.options.database.chatConversations.findByPk(conversationId)
            if (!conversation) throw new Error('Conversation not found')

            // 1. Core Conversation Context (History & Mentions)
            // Allocate initial budget for history
            const historyBudget = Math.floor(this.tokenBudget * 0.3) // 30% for history
            await this.addConversationHistory(conversationId, historyBudget)

            // 2. Iterate Providers for remaining budget
            for (const provider of this.providers) {
                const remainingBudget = this.tokenBudget - this.currentTokens
                if (remainingBudget <= 0) break

                const providerContext = await provider.getContext(
                    conversationId,
                    remainingBudget,
                    config,
                    this.options.database,
                    this.options.currentUser
                )

                // Merge context
                for (const key of Object.keys(providerContext)) {
                    if (key !== 'tokenCount' && providerContext[key]) {
                        this.context[key] = providerContext[key]
                    }
                }
                this.addTokens(providerContext.tokenCount)
            }

            // 3. Mentioned Entities (High Priority specific lookups)
            if (config.includeMentionedEntities !== false && this.context.mentionedEntities) {
                // Logic for mentions if needed, usually comes from provider now or separate process
            }

            return this.context
        } catch (error: any) {
            this.log.error({ error: error.message }, 'Failed to build context')
            throw error
        }
    }

    /**
     * Add conversation history
     */
    async addConversationHistory(conversationId: string, budget: number): Promise<void> {
        try {
            const messages = await this.options.database.chatMessages.findAll({
                where: { conversationId },
                order: [['createdAt', 'DESC']],
                limit: 15,
                attributes: ['senderType', 'content', 'agentId', 'createdAt'],
            })

            // Also fetch memory summary if available
            const conversation = await this.options.database.chatConversations.findByPk(conversationId)
            if (conversation?.context?.summary) {
                const summary = conversation.context.summary
                const cost = this.estimateTokens(summary)
                if (this.canAddTokens(cost)) {
                    this.context.summary = summary
                    this.addTokens(cost)
                }
            }

            const historyContext: any[] = []
            let currentHistoryTokens = 0

            for (const m of messages) {
                const item = {
                    role: m.senderType === 'user' ? 'user' : 'assistant',
                    content: m.content?.substring(0, 500),
                    agentId: m.agentId,
                    timestamp: m.createdAt,
                }
                const cost = this.estimateTokens(item)

                if (currentHistoryTokens + cost <= budget && this.canAddTokens(cost)) {
                    historyContext.unshift(item)
                    currentHistoryTokens += cost
                    this.addTokens(cost)
                }
            }

            if (historyContext.length > 0) {
                this.context.conversationHistory = historyContext
            }

        } catch (error: any) {
            this.log.warn({ error: error.message }, 'Failed to add history')
        }
    }

    /**
     * Load full details for mentioned entities
     */
    async loadMentionedEntities(entities: EntityReference[]): Promise<any[]> {
        const loaded: any[] = []
        for (const entity of entities.slice(0, 5)) {
            try {
                let entityData: any = null
                switch (entity.type) {
                    case 'issue':
                        const issue = await this.options.database.devtelIssues.findByPk(entity.id, { attributes: ['id', 'title', 'status', 'priority'] })
                        if (issue) entityData = { type: 'issue', id: issue.id, title: issue.title, status: issue.status, priority: issue.priority }
                        break;
                    case 'user':
                        const user = await this.options.database.user.findByPk(entity.id, { attributes: ['id', 'fullName'] })
                        if (user) entityData = { type: 'user', id: user.id, name: user.fullName }
                        break;
                }

                if (entityData && this.canAddTokens(this.estimateTokens(entityData))) {
                    loaded.push(entityData)
                    this.addTokens(this.estimateTokens(entityData))
                }
            } catch (e) { /* ignore */ }
        }
        this.context.mentionedEntities = loaded
        return loaded
    }

    private estimateTokens(data: any): number {
        const jsonStr = JSON.stringify(data)
        return Math.ceil(jsonStr.length * TOKENS_PER_CHAR)
    }

    private canAddTokens(tokens: number): boolean {
        return (this.currentTokens + tokens) <= this.tokenBudget
    }

    private addTokens(tokens: number): void {
        this.currentTokens += tokens
    }

    toJSON(): Record<string, any> {
        return {
            ...this.context,
            _meta: {
                tokenCount: this.currentTokens,
                tokenBudget: this.tokenBudget,
                remainingBudget: this.tokenBudget - this.currentTokens
            }
        }
    }
}
