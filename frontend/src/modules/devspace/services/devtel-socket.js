/**
 * DevTel Socket.IO Client
 * Real-time updates for DevTel features
 */
import { io } from 'socket.io-client'

class DevtelSocketService {
    constructor() {
        this.socket = null
        this.projectId = null
        this.workspaceId = null
        this.eventHandlers = {}
    }

    /**
     * Connect to DevTel WebSocket namespace
     */
    connect() {
        if (this.socket?.connected) return

        // Use relative path by default to rely on proxy, or full URL if strictly needed
        const wsUrl = import.meta.env.VUE_APP_BACKEND_URL || ''

        // Remove trailing slash if present
        const baseUrl = wsUrl.endsWith('/') ? wsUrl.slice(0, -1) : wsUrl

        this.socket = io(`${baseUrl}/devtel`, {
            transports: ['websocket', 'polling'],
            withCredentials: true,
        })

        this.socket.on('connect', () => {
            console.log('[DevTel WS] Connected')
            // Rejoin rooms if we had them
            if (this.projectId) {
                this.joinProject(this.projectId)
            }
            if (this.workspaceId) {
                this.joinWorkspace(this.workspaceId)
            }
        })

        this.socket.on('disconnect', () => {
            console.log('[DevTel WS] Disconnected')
        })

        this.socket.on('connect_error', (error) => {
            console.warn('[DevTel WS] Connection error:', error.message)
        })

        // Set up event handlers
        this._setupEventListeners()
    }

    /**
     * Disconnect from WebSocket
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect()
            this.socket = null
        }
    }

    /**
     * Join a project room for real-time updates
     */
    joinProject(projectId) {
        if (!this.socket?.connected) {
            console.warn(`[DevTel WS] Cannot join project ${projectId}: socket not connected`)
            return
        }

        // Leave previous project room if different
        if (this.projectId && this.projectId !== projectId) {
            this.leaveProject(this.projectId)
        }

        this.projectId = projectId
        this.socket.emit('join:project', projectId)
        console.log(`[DevTel WS] ✓ Joined project room: ${projectId}`)
    }

    /**
     * Leave a project room
     */
    leaveProject(projectId) {
        if (!this.socket?.connected) return
        this.socket.emit('leave:project', projectId)
        if (this.projectId === projectId) {
            this.projectId = null
        }
        console.log(`[DevTel WS] ✗ Left project room: ${projectId}`)
    }

    /**
     * Join workspace room
     */
    joinWorkspace(workspaceId) {
        if (!this.socket?.connected) {
            console.warn(`[DevTel WS] Cannot join workspace ${workspaceId}: socket not connected`)
            return
        }
        this.workspaceId = workspaceId
        this.socket.emit('join:workspace', workspaceId)
        console.log(`[DevTel WS] ✓ Joined workspace room: ${workspaceId}`)
    }

    /**
     * Join agent job room for AI progress updates
     */
    joinAgentJob(jobId) {
        if (!this.socket?.connected) {
            console.warn(`[DevTel WS] Cannot join agent job ${jobId}: socket not connected`)
            return
        }
        this.socket.emit('join:agent', jobId)
        console.log(`[DevTel WS] ✓ Joined agent job room: ${jobId}`)
    }

    /**
     * Join spec room
     */
    joinSpec(specId) {
        if (!this.socket?.connected) {
            console.warn(`[DevTel WS] Cannot join spec ${specId}: socket not connected`)
            return
        }
        this.socket.emit('join:spec', specId)
        console.log(`[DevTel WS] ✓ Joined spec room: ${specId}`)
    }

    /**
     * Leave spec room
     */
    leaveSpec(specId) {
        if (!this.socket?.connected) return
        this.socket.emit('leave:spec', specId)
        console.log(`[DevTel WS] ✗ Left spec room: ${specId}`)
    }

    /**
     * Register event handler
     */
    on(event, handler) {
        if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = []
        }
        this.eventHandlers[event].push(handler)
        console.log(`[DevTel WS] Registered listener for event: ${event}`)

        // If socket is already connected, add listener
        if (this.socket) {
            // Wrap handler to add logging
            const wrappedHandler = (data) => {
                console.log(`[DevTel WS] ⬇ Received event: ${event}`, data)
                handler(data)
            }
            this.socket.on(event, wrappedHandler)
            // Store wrapped handler for removal later
            if (!this.eventHandlers[`_wrapped_${event}`]) {
                this.eventHandlers[`_wrapped_${event}`] = []
            }
            this.eventHandlers[`_wrapped_${event}`].push({ original: handler, wrapped: wrappedHandler })
        }
    }

    /**
     * Remove event handler
     */
    off(event, handler) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler)
        }
        if (this.socket) {
            // Find and remove wrapped handler
            const wrappedHandlers = this.eventHandlers[`_wrapped_${event}`] || []
            const match = wrappedHandlers.find(w => w.original === handler)
            if (match) {
                this.socket.off(event, match.wrapped)
                this.eventHandlers[`_wrapped_${event}`] = wrappedHandlers.filter(w => w !== match)
            } else {
                this.socket.off(event, handler)
            }
        }
        console.log(`[DevTel WS] Removed listener for event: ${event}`)
    }

    /**
     * Set up all event listeners
     */
    _setupEventListeners() {
        console.log(`[DevTel WS] Re-registering ${Object.keys(this.eventHandlers).filter(k => !k.startsWith('_wrapped_')).length} event listeners`)
        // Re-register all stored handlers
        Object.entries(this.eventHandlers).forEach(([event, handlers]) => {
            if (event.startsWith('_wrapped_')) return // Skip wrapped handlers storage
            handlers.forEach(handler => {
                const wrappedHandler = (data) => {
                    console.log(`[DevTel WS] ⬇ Received event: ${event}`, data)
                    handler(data)
                }
                this.socket.on(event, wrappedHandler)
                // Update wrapped handler storage
                if (!this.eventHandlers[`_wrapped_${event}`]) {
                    this.eventHandlers[`_wrapped_${event}`] = []
                }
                this.eventHandlers[`_wrapped_${event}`].push({ original: handler, wrapped: wrappedHandler })
            })
        })
    }
}

// Singleton instance
export const devtelSocket = new DevtelSocketService()

// Vue plugin
export default {
    install(app) {
        app.config.globalProperties.$devtelSocket = devtelSocket
        app.provide('devtelSocket', devtelSocket)
    }
}
