import { IRedisConfiguration, RedisClient, IRedisPubSubPair } from './types';
export declare const getRedisClient: (config: IRedisConfiguration, exitOnError?: boolean) => Promise<RedisClient>;
export declare const stopClient: (client: RedisClient) => Promise<string>;
export declare const flushRedisContent: (client: RedisClient) => Promise<void>;
export declare const getRedisPubSubPair: (config: IRedisConfiguration) => Promise<IRedisPubSubPair>;
export declare const stopPubSubPair: (pair: IRedisPubSubPair) => Promise<void>;
//# sourceMappingURL=client.d.ts.map