import { RedisClientType, RedisDefaultModules } from 'redis';
export type RedisClient = RedisClientType<RedisDefaultModules>;
export interface IRedisPubSubPair {
    pubClient: RedisClient;
    subClient: RedisClient;
}
export interface IRedisConfiguration {
    username: string;
    password: string;
    host: string;
    port: string;
}
export interface IRedisPubSubEmitter {
    emit<T>(channel: string, data: T): any;
}
export interface IRedisPubSubReceiver {
    subscribe<T>(channel: string, listener: (data: T) => Promise<void>): string;
    unsubscribe(id: string): any;
}
export interface IRedisPubSubBus extends IRedisPubSubEmitter, IRedisPubSubReceiver {
}
//# sourceMappingURL=types.d.ts.map