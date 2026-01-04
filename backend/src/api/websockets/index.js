"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const logging_1 = require("@gitmesh/logging");
const namespace_1 = __importDefault(require("./namespace"));
const devtel_1 = __importDefault(require("./devtel"));
class WebSockets {
    constructor(server) {
        this.log = (0, logging_1.getServiceChildLogger)('websockets');
        this.socketIo = new socket_io_1.Server(server);
        this.devtel = new devtel_1.default(this.socketIo);
        this.log.info('Socket.IO server initialized!');
    }
    authenticatedNamespace(name) {
        return new namespace_1.default(this.socketIo, name, true);
    }
    static async initialize(server) {
        const websockets = new WebSockets(server);
        return {
            userNamespace: websockets.authenticatedNamespace('/user'),
            devtel: websockets.devtel,
            socketIo: websockets.socketIo,
        };
    }
}
exports.default = WebSockets;
//# sourceMappingURL=index.js.map