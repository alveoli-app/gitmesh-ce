/**
 * Chat Socket.IO Namespace
 * Handles real-time communication for chat streaming and updates
 */

import { Server as SocketIOServer } from 'socket.io'

export interface ChatSocketEvents {
    // Server to client
    'stream:token': { conversationId: string; messageId: string; token: string }
    'stream:complete': { conversationId: string; messageId: string; fullContent: string }
    'stream:error': { conversationId: string; messageId: string; error: string }
    'message:created': { message: any }
    'proposal:created': { proposal: any }
    'proposal:executed': { proposalId: string; result: any }
    'proposal:rejected': { proposalId: string; reason: string }
    'insight:created': { insight: any }
    'agent:status': { agentId: string; status: string; taskDescription?: string }

    // Client to server
    'conversation:join': { conversationId: string }
    'conversation:leave': { conversationId: string }
    'stream:cancel': { conversationId: string; messageId: string }
    'typing:start': { conversationId: string }
    'typing:stop': { conversationId: string }
}

export function initChatSocket(io: SocketIOServer) {
    const chatNamespace = io.of('/chat')

    chatNamespace.on('connection', (socket) => {
        const userId = socket.handshake.auth?.userId
        const tenantId = socket.handshake.auth?.tenantId

        console.log(`Chat socket connected: ${socket.id}, user: ${userId}`)

        // Join user's personal room for notifications
        if (userId) {
            socket.join(`user:${userId}`)
        }

        // Join tenant room for workspace-wide events
        if (tenantId) {
            socket.join(`tenant:${tenantId}`)
        }

        // Handle conversation joins
        socket.on('conversation:join', ({ conversationId }) => {
            if (!conversationId) return

            socket.join(`conversation:${conversationId}`)
            console.log(`Socket ${socket.id} joined conversation ${conversationId}`)
        })

        // Handle conversation leaves
        socket.on('conversation:leave', ({ conversationId }) => {
            if (!conversationId) return

            socket.leave(`conversation:${conversationId}`)
            console.log(`Socket ${socket.id} left conversation ${conversationId}`)
        })

        // Handle typing events
        socket.on('typing:start', ({ conversationId }) => {
            if (!conversationId) return
            socket.to(`conversation:${conversationId}`).emit('typing:start', {
                conversationId,
                userId,
                userName: socket.handshake.auth?.fullName || 'User',
            })
        })

        socket.on('typing:stop', ({ conversationId }) => {
            if (!conversationId) return
            socket.to(`conversation:${conversationId}`).emit('typing:stop', {
                conversationId,
                userId,
            })
        })

        // Handle stream cancellation
        socket.on('stream:cancel', ({ conversationId, messageId }) => {
            // Emit to backend/CrewAI service to cancel streaming
            // This would need a cancellation mechanism in the backend
            console.log(`Stream cancelled: ${messageId} in ${conversationId}`)
        })

        socket.on('disconnect', () => {
            console.log(`Chat socket disconnected: ${socket.id}`)
        })

        socket.on('error', (error: Error) => {
            console.error(`Chat socket error: ${socket.id}`, error)
        })
    })

    // Helper to emit to conversation room
    const emitToConversation = (conversationId: string, event: string, data: any) => {
        chatNamespace.to(`conversation:${conversationId}`).emit(event, data)
    }

    // Helper to emit to user
    const emitToUser = (userId: string, event: string, data: any) => {
        chatNamespace.to(`user:${userId}`).emit(event, data)
    }

    // Helper to emit to tenant
    const emitToTenant = (tenantId: string, event: string, data: any) => {
        chatNamespace.to(`tenant:${tenantId}`).emit(event, data)
    }

    // Stream a token (for real-time agent responses)
    const streamToken = (conversationId: string, messageId: string, token: string) => {
        emitToConversation(conversationId, 'stream:token', {
            conversationId,
            messageId,
            token,
        })
    }

    // Complete a stream
    const completeStream = (conversationId: string, messageId: string, fullContent: string) => {
        emitToConversation(conversationId, 'stream:complete', {
            conversationId,
            messageId,
            fullContent,
        })
    }

    // Report stream error
    const streamError = (conversationId: string, messageId: string, error: string) => {
        emitToConversation(conversationId, 'stream:error', {
            conversationId,
            messageId,
            error,
        })
    }

    return {
        namespace: chatNamespace,
        emitToConversation,
        emitToUser,
        emitToTenant,
        streamToken,
        completeStream,
        streamError,
    }
}

// Global instance (set in api/index.ts)
export let chatSocket: ReturnType<typeof initChatSocket> | null = null

export function setChatSocket(socket: ReturnType<typeof initChatSocket>) {
    chatSocket = socket
}
