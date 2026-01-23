import { Logger, LoggerBase } from '@gitmesh/logging';
import { IRedisPubSubReceiver, RedisClient, IRedisPubSubEmitter, IRedisPubSubBus, IRedisPubSubPair } from './types';
declare abstract class RedisPubSubBase extends LoggerBase {
    protected readonly prefix: string;
    constructor(scope: string, parentLog: Logger);
}
export declare class RedisPubSubReceiver extends RedisPubSubBase implements IRedisPubSubReceiver {
    private readonly receiver;
    private subscriptionMap;
    constructor(scope: string, receiver: RedisClient, errorHandler: (err: unknown) => void, parentLog: Logger);
    subscribe<T>(channel: string, handler: (data: T) => Promise<void>): string;
    unsubscribe(id: string): void;
}
export declare class RedisPubSubEmitter extends RedisPubSubBase implements IRedisPubSubEmitter {
    private readonly sender;
    constructor(scope: string, sender: RedisClient, errorHandler: (err: unknown) => void, parentLog: Logger);
    emit<T>(channel: string, data: T): void;
}
export declare class RedisPubSubBus extends RedisPubSubBase implements IRedisPubSubBus {
    private readonly emitter;
    private readonly receiver;
    constructor(scope: string, redisPair: IRedisPubSubPair, errorHandler: (err: unknown) => void, parentLog: Logger);
    emit<T>(channel: string, data: T): void;
    subscribe<T>(channel: string, listener: (data: T) => Promise<void>): string;
    unsubscribe(id: string): void;
}
export {};
//# sourceMappingURL=pubsub.d.ts.map