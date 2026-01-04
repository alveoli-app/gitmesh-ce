"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../services/user/permissionChecker"));
/**
 * SSE endpoint for streaming agent responses
 * Clients connect here to receive real-time token updates
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberRead);
    const { conversationId } = req.params;
    // Verify user has access to conversation
    const conversation = await req.database.chatConversations.findOne({
        where: {
            id: conversationId,
            userId: req.currentUser.id,
            deletedAt: null,
        },
    });
    if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
    }
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    // Send initial connection confirmation
    res.write(`data: ${JSON.stringify({ type: 'connected', conversationId })}\n\n`);
    // Keep connection alive with periodic pings
    const pingInterval = setInterval(() => {
        res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
    }, 30000);
    // Listen for messages from Redis pub/sub or Socket.IO
    // This would be implemented with your existing real-time infrastructure
    const messageHandler = (data) => {
        if (data.conversationId === conversationId) {
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        }
    };
    // TODO: Subscribe to conversation channel
    // Example with Socket.IO adapter:
    // req.io.of('/chat').adapter.on('message', messageHandler)
    // Clean up on client disconnect
    req.on('close', () => {
        clearInterval(pingInterval);
        // TODO: Unsubscribe from channel
        // req.io.of('/chat').adapter.off('message', messageHandler)
    });
    // Handle timeout (optional, for very long conversations)
    req.on('timeout', () => {
        res.write(`data: ${JSON.stringify({ type: 'timeout' })}\n\n`);
        res.end();
    });
};
//# sourceMappingURL=messageStream.js.map