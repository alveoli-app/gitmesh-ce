
import { IServiceOptions } from '../../IServiceOptions'

export interface ContextConfig {
    includeProject?: boolean
    includeCycle?: boolean
    includeTeam?: boolean
    includeRecentActivity?: boolean
    includeUserPreferences?: boolean
    includeMentionedEntities?: boolean
    tokenBudget?: number
}

export interface ContextChunk {
    [key: string]: any
    tokenCount: number
}

export interface IContextProvider {
    /**
     * Get unique identifier for the provider
     */
    getProviderId(): string

    /**
     * Get context data within the given budget
     */
    getContext(
        conversationId: string,
        budget: number,
        config: ContextConfig,
        database: any,
        currentUser: any
    ): Promise<ContextChunk>
}
