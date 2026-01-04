"use strict";
/**
 * Chat Socket.IO Namespace
 * Handles real-time communication for chat streaming and updates
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatSocket = void 0;
exports.initChatSocket = initChatSocket;
exports.setChatSocket = setChatSocket;
function initChatSocket(io) {
    const chatNamespace = io.of('/chat');
    chatNamespace.on('connection', (socket) => {
        var _a, _b;
        const userId = (_a = socket.handshake.auth) === null || _a === void 0 ? void 0 : _a.userId;
        const tenantId = (_b = socket.handshake.auth) === null || _b === void 0 ? void 0 : _b.tenantId;
        console.log(`Chat socket connected: ${socket.id}, user: ${userId}`);
        // Join user's personal room for notifications
        if (userId) {
            socket.join(`user:${userId}`);
        }
        // Join tenant room for workspace-wide events
        if (tenantId) {
            socket.join(`tenant:${tenantId}`);
        }
        // Handle conversation joins
        socket.on('conversation:join', ({ conversationId }) => {
            if (!conversationId)
                return;
            socket.join(`conversation:${conversationId}`);
            console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
        });
        // Handle conversation leaves
        socket.on('conversation:leave', ({ conversationId }) => {
            if (!conversationId)
                return;
            socket.leave(`conversation:${conversationId}`);
            console.log(`Socket ${socket.id} left conversation ${conversationId}`);
        });
        // Handle typing events
        socket.on('typing:start', ({ conversationId }) => {
            var _a;
            if (!conversationId)
                return;
            socket.to(`conversation:${conversationId}`).emit('typing:start', {
                conversationId,
                userId,
                userName: ((_a = socket.handshake.auth) === null || _a === void 0 ? void 0 : _a.fullName) || 'User',
            });
        });
        socket.on('typing:stop', ({ conversationId }) => {
            if (!conversationId)
                return;
            socket.to(`conversation:${conversationId}`).emit('typing:stop', {
                conversationId,
                userId,
            });
        });
        // Handle stream cancellation
        socket.on('stream:cancel', ({ conversationId, messageId }) => {
            // Emit to backend/CrewAI service to cancel streaming
            // This would need a cancellation mechanism in the backend
            console.log(`Stream cancelled: ${messageId} in ${conversationId}`);
        });
        socket.on('disconnect', () => {
            console.log(`Chat socket disconnected: ${socket.id}`);
        });
        socket.on('error', (error) => {
            console.error(`Chat socket error: ${socket.id}`, error);
        });
    });
    // Helper to emit to conversation room
    const emitToConversation = (conversationId, event, data) => {
        chatNamespace.to(`conversation:${conversationId}`).emit(event, data);
    };
    // Helper to emit to user
    const emitToUser = (userId, event, data) => {
        chatNamespace.to(`user:${userId}`).emit(event, data);
    };
    // Helper to emit to tenant
    const emitToTenant = (tenantId, event, data) => {
        chatNamespace.to(`tenant:${tenantId}`).emit(event, data);
    };
    // Stream a token (for real-time agent responses)
    const streamToken = (conversationId, messageId, token) => {
        emitToConversation(conversationId, 'stream:token', {
            conversationId,
            messageId,
            token,
        });
    };
    // Complete a stream
    const completeStream = (conversationId, messageId, fullContent) => {
        emitToConversation(conversationId, 'stream:complete', {
            conversationId,
            messageId,
            fullContent,
        });
    };
    // Report stream error
    const streamError = (conversationId, messageId, error) => {
        emitToConversation(conversationId, 'stream:error', {
            conversationId,
            messageId,
            error,
        });
    };
    return {
        namespace: chatNamespace,
        emitToConversation,
        emitToUser,
        emitToTenant,
        streamToken,
        completeStream,
        streamError,
    };
}
// Global instance (set in api/index.ts)
exports.chatSocket = null;
function setChatSocket(socket) {
    exports.chatSocket = socket;
}
//# sourceMappingURL=chatSocket.js.map