/**
 * DevTel WebSocket Namespace
 * Handles real-time updates for DevTel features
 */
import { Server as SocketServer, Namespace, Socket } from 'socket.io'
import { Logger, getServiceChildLogger } from '@gitmesh/logging'

export interface DevtelSocket extends Socket {
    userId?: string
    tenantId?: string
    workspaceId?: string
}

export default class DevtelWebSocketNamespace {
    private readonly log: Logger
    private readonly namespace: Namespace

    constructor(io: SocketServer) {
        this.log = getServiceChildLogger('devtel-websockets')
        this.namespace = io.of('/devtel')
        this.setupEventHandlers()
        this.log.info('DevTel WebSocket namespace initialized')
    }

    private setupEventHandlers(): void {
        this.namespace.on('connection', (socket: DevtelSocket) => {
            this.log.info({ socketId: socket.id }, 'DevTel client connected')

            // Join project room
            socket.on('join:project', (projectId: string) => {
                socket.join(`project:${projectId}`)
                const roomSize = this.namespace.adapter.rooms.get(`project:${projectId}`)?.size || 0
                this.log.info({ socketId: socket.id, projectId, roomSize }, 'Joined project room')
            })

            // Leave project room
            socket.on('leave:project', (projectId: string) => {
                socket.leave(`project:${projectId}`)
                const roomSize = this.namespace.adapter.rooms.get(`project:${projectId}`)?.size || 0
                this.log.info({ socketId: socket.id, projectId, roomSize }, 'Left project room')
            })

            // Join workspace room
            socket.on('join:workspace', (workspaceId: string) => {
                socket.join(`workspace:${workspaceId}`)
                socket.workspaceId = workspaceId
                const roomSize = this.namespace.adapter.rooms.get(`workspace:${workspaceId}`)?.size || 0
                this.log.info({ socketId: socket.id, workspaceId, roomSize }, 'Joined workspace room')
            })

            // Join agent job room (for AI progress updates)
            socket.on('join:agent', (jobId: string) => {
                socket.join(`agent:${jobId}`)
                const roomSize = this.namespace.adapter.rooms.get(`agent:${jobId}`)?.size || 0
                this.log.info({ socketId: socket.id, jobId, roomSize }, 'Joined agent job room')
            })

            // Join spec room (for presence)
            socket.on('join:spec', (specId: string) => {
                const room = `spec:${specId}`;
                socket.join(room);
                // Broadcast presence to others in the room
                socket.to(room).emit('spec:viewer-joined', { userId: socket.userId, socketId: socket.id });
                this.log.info({ socketId: socket.id, specId }, 'Joined spec room');
            });

            // Leave spec room
            socket.on('leave:spec', (specId: string) => {
                const room = `spec:${specId}`;
                socket.leave(room);
                socket.to(room).emit('spec:viewer-left', { userId: socket.userId, socketId: socket.id });
                this.log.info({ socketId: socket.id, specId }, 'Left spec room');
            });

            socket.on('disconnect', () => {
                this.log.info({ socketId: socket.id }, 'DevTel client disconnected')
            })
        })
    }

    // ============================================
    // Issue Events
    // ============================================
    public emitIssueCreated(projectId: string, issue: any): void {
        const room = `project:${projectId}`
        const roomSize = this.namespace.adapter.rooms.get(room)?.size || 0
        this.namespace.to(room).emit('issue:created', issue)
        this.log.info({ projectId, issueId: issue.id, roomSize }, 'Emitted issue:created to project room')
    }

    public emitIssueUpdated(projectId: string, issue: any): void {
        const room = `project:${projectId}`
        const roomSize = this.namespace.adapter.rooms.get(room)?.size || 0
        this.namespace.to(room).emit('issue:updated', issue)
        this.log.info({ projectId, issueId: issue.id, roomSize }, 'Emitted issue:updated to project room')
    }

    public emitIssueDeleted(projectId: string, issueId: string): void {
        const room = `project:${projectId}`
        const roomSize = this.namespace.adapter.rooms.get(room)?.size || 0
        this.namespace.to(room).emit('issue:deleted', { id: issueId })
        this.log.info({ projectId, issueId, roomSize }, 'Emitted issue:deleted to project room')
    }

    public emitIssueStatusChanged(projectId: string, issue: any, previousStatus: string): void {
        const room = `project:${projectId}`
        const roomSize = this.namespace.adapter.rooms.get(room)?.size || 0
        this.namespace.to(room).emit('issue:status-changed', {
            issue,
            previousStatus,
            newStatus: issue.status,
        })
        this.log.info({ projectId, issueId: issue.id, previousStatus, newStatus: issue.status, roomSize }, 'Emitted issue:status-changed to project room')
    }

    // ============================================
    // Comment Events
    // ============================================
    public emitCommentAdded(projectId: string, issueId: string, comment: any): void {
        this.namespace.to(`project:${projectId}`).emit('comment:added', {
            issueId,
            comment,
        })
    }

    // ============================================
    // Cycle Events
    // ============================================
    public emitCycleUpdated(projectId: string, cycle: any): void {
        this.namespace.to(`project:${projectId}`).emit('cycle:updated', cycle)
    }

    public emitCycleStarted(projectId: string, cycle: any): void {
        this.namespace.to(`project:${projectId}`).emit('cycle:started', cycle)
    }

    public emitCycleCompleted(projectId: string, cycle: any): void {
        this.namespace.to(`project:${projectId}`).emit('cycle:completed', cycle)
    }

    // ============================================
    // Agent/AI Events
    // ============================================
    public emitAgentThinking(jobId: string, thought: string): void {
        this.namespace.to(`agent:${jobId}`).emit('agent:thinking', {
            jobId,
            thought,
            timestamp: new Date().toISOString(),
        })
    }

    public emitAgentProgress(jobId: string, progress: number, message: string): void {
        this.namespace.to(`agent:${jobId}`).emit('agent:progress', {
            jobId,
            progress,
            message,
        })
    }

    public emitAgentCompleted(jobId: string, result: any): void {
        this.namespace.to(`agent:${jobId}`).emit('agent:completed', {
            jobId,
            result,
        })
    }

    public emitAgentError(jobId: string, error: string): void {
        this.namespace.to(`agent:${jobId}`).emit('agent:error', {
            jobId,
            error,
        })
    }

    // ============================================
    // Spec Events
    // ============================================
    public emitSpecUpdated(projectId: string, spec: any): void {
        this.namespace.to(`project:${projectId}`).emit('spec:updated', spec)
    }

    // ============================================
    // Workspace Events
    // ============================================
    public emitWorkspaceSync(workspaceId: string, syncStatus: any): void {
        this.namespace.to(`workspace:${workspaceId}`).emit('workspace:sync', syncStatus)
    }
}
