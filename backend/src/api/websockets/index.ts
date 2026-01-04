import { Server as SocketServer } from 'socket.io'
import { Server } from 'http'
import { Logger, getServiceChildLogger } from '@gitmesh/logging'
import WebSocketNamespace from './namespace'
import DevtelWebSocketNamespace from './devtel'
import { IAuthenticatedSocket } from './types'

export default class WebSockets {
  private readonly log: Logger

  private readonly socketIo: SocketServer

  public readonly devtel: DevtelWebSocketNamespace

  public constructor(server: Server) {
    this.log = getServiceChildLogger('websockets')
    this.socketIo = new SocketServer(server)
    this.devtel = new DevtelWebSocketNamespace(this.socketIo)

    this.log.info('Socket.IO server initialized!')
  }

  public authenticatedNamespace(name: string): WebSocketNamespace<IAuthenticatedSocket> {
    return new WebSocketNamespace<IAuthenticatedSocket>(this.socketIo, name, true)
  }

  public static async initialize(
    server: Server,
  ): Promise<{ 
    userNamespace: WebSocketNamespace<IAuthenticatedSocket>; 
    devtel: DevtelWebSocketNamespace;
    socketIo: SocketServer;
  }> {
    const websockets = new WebSockets(server)
    return {
      userNamespace: websockets.authenticatedNamespace('/user'),
      devtel: websockets.devtel,
      socketIo: websockets.socketIo,
    }
  }
}
