/**
 * Chat Vuex Store Module
 * Main store for Chat functionality
 */

import ChatApi from '@/modules/chat/services/chat-api'

const state = () => ({
    // Conversations
    conversations: [],
    conversationsLoading: false,
    conversationsError: null,
    activeConversation: null,

    // Messages
    messages: {},  // keyed by conversationId
    messagesLoading: false,
    streamingMessage: null,

    // Proposals
    pendingProposals: [],

    // Agents
    agents: [],
    agentsLoading: false,

    // Insights
    insights: [],
    insightsLoading: false,

    // Counts for badges
    pendingActionsCount: 0,
    activeInsightsCount: 0,
    unreadCount: 0,
})

const getters = {
    recentConversations: (state) => {
        return [...state.conversations]
            .sort((a, b) => {
                const dateA = new Date(b.lastMessageAt || b.createdAt).getTime()
                const dateB = new Date(a.lastMessageAt || a.createdAt).getTime()
                return dateA - dateB
            })
            .slice(0, 20)
    },

    getConversationById: (state) => (id) => {
        return state.conversations.find(c => c.id === id)
    },

    getMessagesForConversation: (state) => (conversationId) => {
        return state.messages[conversationId] || []
    },

    pendingActionsCount: (state) => state.pendingActionsCount,
    activeInsightsCount: (state) => state.activeInsightsCount,
    unreadCount: (state) => state.unreadCount,

    isStreamingResponse: (state) => !!state.streamingMessage,
}

const mutations = {
    // Conversations
    SET_CONVERSATIONS(state, conversations) {
        state.conversations = conversations
    },

    ADD_CONVERSATION(state, conversation) {
        state.conversations.unshift(conversation)
    },

    UPDATE_CONVERSATION(state, { id, updates }) {
        const index = state.conversations.findIndex(c => c.id === id)
        if (index !== -1) {
            state.conversations[index] = { ...state.conversations[index], ...updates }
        }
    },

    REMOVE_CONVERSATION(state, id) {
        state.conversations = state.conversations.filter(c => c.id !== id)
    },

    SET_ACTIVE_CONVERSATION(state, conversation) {
        state.activeConversation = conversation
    },

    SET_CONVERSATIONS_LOADING(state, loading) {
        state.conversationsLoading = loading
    },

    SET_CONVERSATIONS_ERROR(state, error) {
        state.conversationsError = error
    },

    // Messages
    SET_MESSAGES(state, { conversationId, messages }) {
        state.messages = {
            ...state.messages,
            [conversationId]: messages,
        }
    },

    ADD_MESSAGE(state, { conversationId, message }) {
        if (!state.messages[conversationId]) {
            state.messages[conversationId] = []
        }
        state.messages[conversationId].push(message)
    },

    UPDATE_MESSAGE(state, { conversationId, messageId, updates }) {
        const messages = state.messages[conversationId] || []
        const index = messages.findIndex(m => m.id === messageId)
        if (index !== -1) {
            state.messages[conversationId][index] = { ...messages[index], ...updates }
        }
    },

    SET_MESSAGES_LOADING(state, loading) {
        state.messagesLoading = loading
    },

    SET_STREAMING_MESSAGE(state, message) {
        state.streamingMessage = message
    },

    APPEND_TO_STREAMING(state, content) {
        if (state.streamingMessage) {
            state.streamingMessage.content += content
        }
    },

    // Proposals
    SET_PENDING_PROPOSALS(state, proposals) {
        state.pendingProposals = proposals
    },

    REMOVE_PROPOSAL(state, proposalId) {
        state.pendingProposals = state.pendingProposals.filter(p => p.id !== proposalId)
    },

    // Agents
    SET_AGENTS(state, agents) {
        state.agents = agents
    },

    SET_AGENTS_LOADING(state, loading) {
        state.agentsLoading = loading
    },

    UPDATE_AGENT(state, { id, updates }) {
        const index = state.agents.findIndex(a => a.id === id)
        if (index !== -1) {
            state.agents[index] = { ...state.agents[index], ...updates }
        }
    },

    // Insights
    SET_INSIGHTS(state, insights) {
        state.insights = insights
    },

    SET_INSIGHTS_LOADING(state, loading) {
        state.insightsLoading = loading
    },

    REMOVE_INSIGHT(state, insightId) {
        state.insights = state.insights.filter(i => i.id !== insightId)
    },

    // Counts
    SET_PENDING_ACTIONS_COUNT(state, count) {
        state.pendingActionsCount = count
    },

    SET_ACTIVE_INSIGHTS_COUNT(state, count) {
        state.activeInsightsCount = count
    },

    SET_UNREAD_COUNT(state, count) {
        state.unreadCount = count
    },
}

const actions = {
    // ========================================
    // Conversations
    // ========================================

    async fetchConversations({ commit, state }, params = {}) {
        if (state.conversationsLoading) return { rows: [] }

        commit('SET_CONVERSATIONS_LOADING', true)
        commit('SET_CONVERSATIONS_ERROR', null)

        try {
            const result = await ChatApi.listConversations(params)
            commit('SET_CONVERSATIONS', result.rows || result || [])
            return result
        } catch (error) {
            commit('SET_CONVERSATIONS_ERROR', error.message)
            // Return empty data instead of throwing to allow graceful degradation
            commit('SET_CONVERSATIONS', [])
            return { rows: [] }
        } finally {
            commit('SET_CONVERSATIONS_LOADING', false)
        }
    },

    async createConversation({ commit }, data = {}) {
        try {
            const conversation = await ChatApi.createConversation(data)
            commit('ADD_CONVERSATION', conversation)
            return conversation
        } catch (error) {
            console.error('Failed to create conversation:', error)
            throw error
        }
    },

    async loadConversation({ commit }, conversationId) {
        try {
            const conversation = await ChatApi.getConversation(conversationId)
            commit('SET_ACTIVE_CONVERSATION', conversation)
            if (conversation.messages) {
                commit('SET_MESSAGES', { conversationId, messages: conversation.messages })
            }
            return conversation
        } catch (error) {
            console.error('Failed to load conversation:', error)
            throw error
        }
    },

    async deleteConversation({ commit }, conversationId) {
        try {
            await ChatApi.deleteConversation(conversationId)
            commit('REMOVE_CONVERSATION', conversationId)
        } catch (error) {
            console.error('Failed to delete conversation:', error)
            throw error
        }
    },

    // ========================================
    // Messages
    // ========================================

    async sendMessage({ commit, dispatch }, { conversationId, content, mentionedEntities = [] }) {
        try {
            const result = await ChatApi.sendMessage(conversationId, content, mentionedEntities)

            // Add user message immediately
            commit('ADD_MESSAGE', { conversationId, message: result.userMessage })

            // Add placeholder for agent message (streaming)
            if (result.agentMessage) {
                commit('ADD_MESSAGE', { conversationId, message: result.agentMessage })
                commit('SET_STREAMING_MESSAGE', result.agentMessage)
            }

            // Update conversation stats
            commit('UPDATE_CONVERSATION', {
                id: conversationId,
                updates: {
                    lastMessageAt: new Date().toISOString(),
                    messageCount: (result.messageCount || 0) + 1,
                }
            })

            return result
        } catch (error) {
            console.error('Failed to send message:', error)
            throw error
        }
    },

    updateStreamingMessage({ commit }, { conversationId, messageId, content, isComplete }) {
        commit('UPDATE_MESSAGE', {
            conversationId,
            messageId,
            updates: {
                content,
                isStreaming: !isComplete,
                streamCompletedAt: isComplete ? new Date().toISOString() : null,
            }
        })

        if (isComplete) {
            commit('SET_STREAMING_MESSAGE', null)
        }
    },

    // ========================================
    // Proposals
    // ========================================

    async approveProposal({ commit, dispatch }, proposalId) {
        try {
            const result = await ChatApi.approveProposal(proposalId)
            commit('REMOVE_PROPOSAL', proposalId)

            // Refresh pending count
            dispatch('fetchPendingActionsCount')

            return result
        } catch (error) {
            console.error('Failed to approve proposal:', error)
            throw error
        }
    },

    async rejectProposal({ commit }, { proposalId, reason }) {
        try {
            await ChatApi.rejectProposal(proposalId, reason)
            commit('REMOVE_PROPOSAL', proposalId)
        } catch (error) {
            console.error('Failed to reject proposal:', error)
            throw error
        }
    },

    // ========================================
    // Agents
    // ========================================

    async fetchAgents({ commit }) {
        commit('SET_AGENTS_LOADING', true)
        try {
            const result = await ChatApi.getAgents()
            commit('SET_AGENTS', result.agents || [])
            return result
        } catch (error) {
            console.error('Failed to fetch agents:', error)
            throw error
        } finally {
            commit('SET_AGENTS_LOADING', false)
        }
    },

    async toggleAgent({ commit }, { agentId, enabled }) {
        try {
            await ChatApi.updateAgent(agentId, { enabled })
            commit('UPDATE_AGENT', { id: agentId, updates: { enabled } })
        } catch (error) {
            console.error('Failed to toggle agent:', error)
            throw error
        }
    },

    // ========================================
    // Insights
    // ========================================

    async fetchInsights({ commit }, params = {}) {
        commit('SET_INSIGHTS_LOADING', true)
        try {
            const result = await ChatApi.getInsights(params)
            commit('SET_INSIGHTS', result.rows || [])
            return result
        } catch (error) {
            console.error('Failed to fetch insights:', error)
            throw error
        } finally {
            commit('SET_INSIGHTS_LOADING', false)
        }
    },

    async dismissInsight({ commit }, { insightId, reason, comment }) {
        try {
            await ChatApi.dismissInsight(insightId, reason, comment)
            commit('REMOVE_INSIGHT', insightId)
        } catch (error) {
            console.error('Failed to dismiss insight:', error)
            throw error
        }
    },

    // ========================================
    // Badge Counts
    // ========================================

    async fetchPendingActionsCount({ commit }) {
        try {
            const result = await ChatApi.getActions({ status: 'pending', limit: 1 })
            commit('SET_PENDING_ACTIONS_COUNT', result.count || 0)
        } catch (error) {
            // Silently handle - API may not be available
            commit('SET_PENDING_ACTIONS_COUNT', 0)
        }
    },

    async fetchActiveInsightsCount({ commit }) {
        try {
            const result = await ChatApi.getInsights({ status: 'active', limit: 1 })
            commit('SET_ACTIVE_INSIGHTS_COUNT', result.count || 0)
        } catch (error) {
            // Silently handle - API may not be available
            commit('SET_ACTIVE_INSIGHTS_COUNT', 0)
        }
    },
}

export default {
    namespaced: true,
    state,
    getters,
    mutations,
    actions,
}
