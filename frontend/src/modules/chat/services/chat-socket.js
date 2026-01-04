/**
 * Chat Socket Service (Frontend)
 * Manages WebSocket connection for real-time chat updates
 */

import io from 'socket.io-client'
import { ElMessage } from 'element-plus'

class ChatSocketService {
    constructor() {
        this.socket = null
        this.connected = false
        this.listeners = new Map()
        this.reconnectAttempts = 0
        this.maxReconnectAttempts = 5
    }

    /**
     * Connect to chat WebSocket
     */
    connect(authToken, tenantId, userId) {
        if (this.socket?.connected) {
            return this.socket
        }

        const baseUrl = window.location.origin.replace(/:\d+$/, ':8081')

        this.socket = io(`${baseUrl}/chat`, {
            auth: {
                token: authToken,
                tenantId,
                userId,
            },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: this.maxReconnectAttempts,
        })

        this._setupConnectionHandlers()

        return this.socket
    }

    /**
     * Disconnect from WebSocket
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect()
            this.socket = null
            this.connected = false
        }
    }

    /**
     * Join a conversation room
     */
    joinConversation(conversationId) {
        if (!this.socket || !conversationId) return

        this.socket.emit('conversation:join', { conversationId })
    }

    /**
     * Leave a conversation room
     */
    leaveConversation(conversationId) {
        if (!this.socket || !conversationId) return

        this.socket.emit('conversation:leave', { conversationId })
    }

    /**
     * Cancel ongoing stream
     */
    cancelStream(conversationId, messageId) {
        if (!this.socket) return

        this.socket.emit('stream:cancel', { conversationId, messageId })
    }

    /**
     * Subscribe to events
     */
    on(event, callback) {
        if (!this.socket) {
            console.warn('Socket not connected, queuing listener for:', event)
            if (!this.listeners.has(event)) {
                this.listeners.set(event, [])
            }
            this.listeners.get(event).push(callback)
            return
        }

        this.socket.on(event, callback)
    }

    /**
     * Unsubscribe from events
     */
    off(event, callback) {
        if (!this.socket) return

        if (callback) {
            this.socket.off(event, callback)
        } else {
            this.socket.off(event)
        }
    }

    /**
     * Subscribe to streaming token updates
     */
    onStreamToken(callback) {
        this.on('stream:token', callback)
    }

    /**
     * Subscribe to stream completion
     */
    onStreamComplete(callback) {
        this.on('stream:complete', callback)
    }

    /**
     * Subscribe to stream errors
     */
    onStreamError(callback) {
        this.on('stream:error', callback)
    }

    /**
     * Subscribe to new messages
     */
    onMessageCreated(callback) {
        this.on('message:created', callback)
    }

    /**
     * Subscribe to proposal updates
     */
    onProposalCreated(callback) {
        this.on('proposal:created', callback)
    }

    onProposalExecuted(callback) {
        this.on('proposal:executed', callback)
    }

    /**
     * Subscribe to insight notifications
     */
    onInsightCreated(callback) {
        this.on('insight:created', callback)
    }

    /**
     * Subscribe to agent status updates
     */
    onAgentStatus(callback) {
        this.on('agent:status', callback)
    }

    /**
     * Subscribe to typing events
     */
    onTypingStart(callback) {
        this.on('typing:start', callback)
    }

    onTypingStop(callback) {
        this.on('typing:stop', callback)
    }

    /**
     * Send typing start event
     */
    sendTypingStart(conversationId) {
        if (!this.socket || !conversationId) return
        this.socket.emit('typing:start', { conversationId })
    }

    /**
     * Send typing stop event
     */
    sendTypingStop(conversationId) {
        if (!this.socket || !conversationId) return
        this.socket.emit('typing:stop', { conversationId })
    }

    // ========================================
    // Private Methods
    // ========================================

    _setupConnectionHandlers() {
        this.socket.on('connect', () => {
            console.log('Chat socket connected')
            this.connected = true
            this.reconnectAttempts = 0

            // Attach queued listeners
            for (const [event, callbacks] of this.listeners.entries()) {
                for (const callback of callbacks) {
                    this.socket.on(event, callback)
                }
            }
            this.listeners.clear()
        })

        this.socket.on('disconnect', (reason) => {
            console.log('Chat socket disconnected:', reason)
            this.connected = false

            if (reason === 'io server disconnect') {
                // Server disconnected us, try to reconnect
                this.socket.connect()
            }
        })

        this.socket.on('connect_error', (error) => {
            console.error('Chat socket connection error:', error)
            this.reconnectAttempts++

            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                ElMessage.warning('Real-time updates unavailable. Please refresh if issues persist.')
            }
        })

        this.socket.on('error', (error) => {
            console.error('Chat socket error:', error)
        })
    }

    /**
     * Check if connected
     */
    isConnected() {
        return this.connected && this.socket?.connected
    }
}

// Singleton instance
const chatSocketService = new ChatSocketService()

export default chatSocketService
