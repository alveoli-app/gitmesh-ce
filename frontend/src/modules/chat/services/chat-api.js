/**
 * Chat API Service
 * HTTP client for Chat API endpoints
 */

import authAxios from '@/shared/axios/auth-axios'
import { store } from '@/store'

const getTenantId = () => {
    const tenant = store.getters['auth/currentTenant']
    return tenant ? tenant.id : null
}

const API_BASE = (tenantId) => `/tenant/${tenantId}/chat`

export default {
    // ========================================
    // Conversations
    // ========================================

    async listConversations(params = {}) {
        try {
            const tenantId = getTenantId()
            const response = await authAxios.get(`${API_BASE(tenantId)}/conversations`, { params })
            return response.data
        } catch (error) {
            console.error('Failed to list conversations:', error)
            throw error
        }
    },

    async createConversation(data = {}) {
        try {
            const tenantId = getTenantId()
            const response = await authAxios.post(`${API_BASE(tenantId)}/conversations`, data)
            return response.data
        } catch (error) {
            console.error('Failed to create conversation:', error)
            throw error
        }
    },

    async getConversation(conversationId) {
        try {
            const tenantId = getTenantId()
            const response = await authAxios.get(`${API_BASE(tenantId)}/conversations/${conversationId}`)
            return response.data
        } catch (error) {
            console.error('Failed to get conversation:', error)
            throw error
        }
    },

    async updateConversation(conversationId, data) {
        try {
            const tenantId = getTenantId()
            const response = await authAxios.put(`${API_BASE(tenantId)}/conversations/${conversationId}`, data)
            return response.data
        } catch (error) {
            console.error('Failed to update conversation:', error)
            throw error
        }
    },

    async deleteConversation(conversationId) {
        try {
            const tenantId = getTenantId()
            const response = await authAxios.delete(`${API_BASE(tenantId)}/conversations/${conversationId}`)
            return response.data
        } catch (error) {
            console.error('Failed to delete conversation:', error)
            throw error
        }
    },

    // ========================================
    // Messages
    // ========================================

    async sendMessage(conversationId, content, mentionedEntities = []) {
        try {
            const tenantId = getTenantId()
            const response = await authAxios.post(
                `${API_BASE(tenantId)}/conversations/${conversationId}/messages`,
                { content, mentionedEntities }
            )
            return response.data
        } catch (error) {
            console.error('Failed to send message:', error)
            throw error
        }
    },

    async getMessages(conversationId, params = {}) {
        try {
            const tenantId = getTenantId()
            const response = await authAxios.get(
                `${API_BASE(tenantId)}/conversations/${conversationId}/messages`,
                { params }
            )
            return response.data
        } catch (error) {
            console.error('Failed to get messages:', error)
            throw error
        }
    },

    // ========================================
    // Proposals
    // ========================================

    async getPendingProposals(conversationId) {
        try {
            const tenantId = getTenantId()
            const response = await authAxios.get(
                `${API_BASE(tenantId)}/conversations/${conversationId}/proposals`
            )
            return response.data
        } catch (error) {
            console.error('Failed to get proposals:', error)
            throw error
        }
    },

    async approveProposal(proposalId) {
        try {
            const tenantId = getTenantId()
            const response = await authAxios.post(`${API_BASE(tenantId)}/proposals/${proposalId}/approve`)
            return response.data
        } catch (error) {
            console.error('Failed to approve proposal:', error)
            throw error
        }
    },

    async rejectProposal(proposalId, reason) {
        try {
            const tenantId = getTenantId()
            const response = await authAxios.post(
                `${API_BASE(tenantId)}/proposals/${proposalId}/reject`,
                { reason }
            )
            return response.data
        } catch (error) {
            console.error('Failed to reject proposal:', error)
            throw error
        }
    },

    // ========================================
    // Actions
    // ========================================

    async getActions(params = {}) {
        try {
            const tenantId = getTenantId()
            const response = await authAxios.get(`${API_BASE(tenantId)}/actions`, { params })
            return response.data
        } catch (error) {
            console.error('Failed to get actions:', error)
            throw error
        }
    },

    async revertAction(actionId) {
        try {
            const tenantId = getTenantId()
            const response = await authAxios.post(`${API_BASE(tenantId)}/actions/${actionId}/revert`)
            return response.data
        } catch (error) {
            console.error('Failed to revert action:', error)
            throw error
        }
    },

    async analyzeAction(actionId) {
        try {
            const tenantId = getTenantId()
            const response = await authAxios.get(`${API_BASE(tenantId)}/actions/${actionId}/analyze`)
            return response.data
        } catch (error) {
            console.error('Failed to analyze action:', error)
            throw error
        }
    },

    // ========================================
    // Compliance
    // ========================================

    async listComplianceExports(params = {}) {
        try {
            const tenantId = getTenantId()
            const response = await authAxios.get(`${API_BASE(tenantId)}/compliance/exports`, { params })
            return response.data
        } catch (error) {
            console.error('Failed to list compliance exports:', error)
            throw error
        }
    },

    async generateComplianceExport(criteria = {}) {
        try {
            const tenantId = getTenantId()
            const response = await authAxios.post(`${API_BASE(tenantId)}/compliance/generate`, criteria)
            return response.data
        } catch (error) {
            console.error('Failed to generate compliance export:', error)
            throw error
        }
    },

    // ========================================
    // Agents
    // ========================================

    async getAgents(params = {}) {
        try {
            const tenantId = getTenantId()
            const response = await authAxios.get(`${API_BASE(tenantId)}/agents`, { params })
            return response.data
        } catch (error) {
            console.error('Failed to get agents:', error)
            throw error
        }
    },

    async updateAgent(agentId, data) {
        try {
            const tenantId = getTenantId()
            const response = await authAxios.put(`${API_BASE(tenantId)}/agents/${agentId}`, data)
            return response.data
        } catch (error) {
            console.error('Failed to update agent:', error)
            throw error
        }
    },

    async getAgentTelemetry(params = {}) {
        try {
            const tenantId = getTenantId()
            const response = await authAxios.get(`${API_BASE(tenantId)}/agents/telemetry`, { params })
            return response.data
        } catch (error) {
            console.error('Failed to get telemetry:', error)
            throw error
        }
    },

    // ========================================
    // Insights
    // ========================================

    async getInsights(params = {}) {
        try {
            const tenantId = getTenantId()
            const response = await authAxios.get(`${API_BASE(tenantId)}/insights`, { params })
            return response.data
        } catch (error) {
            console.error('Failed to get insights:', error)
            throw error
        }
    },

    async updateInsight(insightId, data) {
        try {
            const tenantId = getTenantId()
            const response = await authAxios.put(`${API_BASE(tenantId)}/insights/${insightId}`, data)
            return response.data
        } catch (error) {
            console.error('Failed to update insight:', error)
            throw error
        }
    },

    async dismissInsight(insightId, reason, comment) {
        return this.updateInsight(insightId, {
            status: 'dismissed',
            dismissedReason: reason,
            comment
        })
    },

    async resolveInsight(insightId) {
        return this.updateInsight(insightId, {
            status: 'resolved'
        })
    },

    // ========================================
    // Feedback
    // ========================================

    async submitFeedback(messageId, data) {
        try {
            const tenantId = getTenantId()
            const response = await authAxios.post(
                `${API_BASE(tenantId)}/messages/${messageId}/feedback`,
                data
            )
            return response.data
        } catch (error) {
            console.error('Failed to submit feedback:', error)
            throw error
        }
    },

    async getFeedbackSummary(params = {}) {
        try {
            const tenantId = getTenantId()
            const response = await authAxios.get(`${API_BASE(tenantId)}/feedback/summary`, { params })
            return response.data
        } catch (error) {
            console.error('Failed to get feedback summary:', error)
            throw error
        }
    },
}
