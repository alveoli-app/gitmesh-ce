"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logging_1 = require("@gitmesh/logging");
class DevtelWebSocketNamespace {
    constructor(io) {
        this.log = (0, logging_1.getServiceChildLogger)('devtel-websockets');
        this.namespace = io.of('/devtel');
        this.setupEventHandlers();
        this.log.info('DevTel WebSocket namespace initialized');
    }
    setupEventHandlers() {
        this.namespace.on('connection', (socket) => {
            this.log.info({ socketId: socket.id }, 'DevTel client connected');
            // Join project room
            socket.on('join:project', (projectId) => {
                var _a;
                socket.join(`project:${projectId}`);
                const roomSize = ((_a = this.namespace.adapter.rooms.get(`project:${projectId}`)) === null || _a === void 0 ? void 0 : _a.size) || 0;
                this.log.info({ socketId: socket.id, projectId, roomSize }, 'Joined project room');
            });
            // Leave project room
            socket.on('leave:project', (projectId) => {
                var _a;
                socket.leave(`project:${projectId}`);
                const roomSize = ((_a = this.namespace.adapter.rooms.get(`project:${projectId}`)) === null || _a === void 0 ? void 0 : _a.size) || 0;
                this.log.info({ socketId: socket.id, projectId, roomSize }, 'Left project room');
            });
            // Join workspace room
            socket.on('join:workspace', (workspaceId) => {
                var _a;
                socket.join(`workspace:${workspaceId}`);
                socket.workspaceId = workspaceId;
                const roomSize = ((_a = this.namespace.adapter.rooms.get(`workspace:${workspaceId}`)) === null || _a === void 0 ? void 0 : _a.size) || 0;
                this.log.info({ socketId: socket.id, workspaceId, roomSize }, 'Joined workspace room');
            });
            // Join agent job room (for AI progress updates)
            socket.on('join:agent', (jobId) => {
                var _a;
                socket.join(`agent:${jobId}`);
                const roomSize = ((_a = this.namespace.adapter.rooms.get(`agent:${jobId}`)) === null || _a === void 0 ? void 0 : _a.size) || 0;
                this.log.info({ socketId: socket.id, jobId, roomSize }, 'Joined agent job room');
            });
            // Join spec room (for presence)
            socket.on('join:spec', (specId) => {
                const room = `spec:${specId}`;
                socket.join(room);
                // Broadcast presence to others in the room
                socket.to(room).emit('spec:viewer-joined', { userId: socket.userId, socketId: socket.id });
                this.log.info({ socketId: socket.id, specId }, 'Joined spec room');
            });
            // Leave spec room
            socket.on('leave:spec', (specId) => {
                const room = `spec:${specId}`;
                socket.leave(room);
                socket.to(room).emit('spec:viewer-left', { userId: socket.userId, socketId: socket.id });
                this.log.info({ socketId: socket.id, specId }, 'Left spec room');
            });
            socket.on('disconnect', () => {
                this.log.info({ socketId: socket.id }, 'DevTel client disconnected');
            });
        });
    }
    // ============================================
    // Issue Events
    // ============================================
    emitIssueCreated(projectId, issue) {
        var _a;
        const room = `project:${projectId}`;
        const roomSize = ((_a = this.namespace.adapter.rooms.get(room)) === null || _a === void 0 ? void 0 : _a.size) || 0;
        this.namespace.to(room).emit('issue:created', issue);
        this.log.info({ projectId, issueId: issue.id, roomSize }, 'Emitted issue:created to project room');
    }
    emitIssueUpdated(projectId, issue) {
        var _a;
        const room = `project:${projectId}`;
        const roomSize = ((_a = this.namespace.adapter.rooms.get(room)) === null || _a === void 0 ? void 0 : _a.size) || 0;
        this.namespace.to(room).emit('issue:updated', issue);
        this.log.info({ projectId, issueId: issue.id, roomSize }, 'Emitted issue:updated to project room');
    }
    emitIssueDeleted(projectId, issueId) {
        var _a;
        const room = `project:${projectId}`;
        const roomSize = ((_a = this.namespace.adapter.rooms.get(room)) === null || _a === void 0 ? void 0 : _a.size) || 0;
        this.namespace.to(room).emit('issue:deleted', { id: issueId });
        this.log.info({ projectId, issueId, roomSize }, 'Emitted issue:deleted to project room');
    }
    emitIssueStatusChanged(projectId, issue, previousStatus) {
        var _a;
        const room = `project:${projectId}`;
        const roomSize = ((_a = this.namespace.adapter.rooms.get(room)) === null || _a === void 0 ? void 0 : _a.size) || 0;
        this.namespace.to(room).emit('issue:status-changed', {
            issue,
            previousStatus,
            newStatus: issue.status,
        });
        this.log.info({ projectId, issueId: issue.id, previousStatus, newStatus: issue.status, roomSize }, 'Emitted issue:status-changed to project room');
    }
    // ============================================
    // Comment Events
    // ============================================
    emitCommentAdded(projectId, issueId, comment) {
        this.namespace.to(`project:${projectId}`).emit('comment:added', {
            issueId,
            comment,
        });
    }
    // ============================================
    // Cycle Events
    // ============================================
    emitCycleUpdated(projectId, cycle) {
        this.namespace.to(`project:${projectId}`).emit('cycle:updated', cycle);
    }
    emitCycleStarted(projectId, cycle) {
        this.namespace.to(`project:${projectId}`).emit('cycle:started', cycle);
    }
    emitCycleCompleted(projectId, cycle) {
        this.namespace.to(`project:${projectId}`).emit('cycle:completed', cycle);
    }
    // ============================================
    // Agent/AI Events
    // ============================================
    emitAgentThinking(jobId, thought) {
        this.namespace.to(`agent:${jobId}`).emit('agent:thinking', {
            jobId,
            thought,
            timestamp: new Date().toISOString(),
        });
    }
    emitAgentProgress(jobId, progress, message) {
        this.namespace.to(`agent:${jobId}`).emit('agent:progress', {
            jobId,
            progress,
            message,
        });
    }
    emitAgentCompleted(jobId, result) {
        this.namespace.to(`agent:${jobId}`).emit('agent:completed', {
            jobId,
            result,
        });
    }
    emitAgentError(jobId, error) {
        this.namespace.to(`agent:${jobId}`).emit('agent:error', {
            jobId,
            error,
        });
    }
    // ============================================
    // Spec Events
    // ============================================
    emitSpecUpdated(projectId, spec) {
        this.namespace.to(`project:${projectId}`).emit('spec:updated', spec);
    }
    // ============================================
    // Workspace Events
    // ============================================
    emitWorkspaceSync(workspaceId, syncStatus) {
        this.namespace.to(`workspace:${workspaceId}`).emit('workspace:sync', syncStatus);
    }
}
exports.default = DevtelWebSocketNamespace;
//# sourceMappingURL=devtel.js.map