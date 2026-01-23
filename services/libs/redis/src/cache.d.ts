import { ICache } from '@gitmesh/types';
import { Logger, LoggerBase } from '@gitmesh/logging';
import { RedisClient } from './types';
export declare class RedisCache extends LoggerBase implements ICache {
    readonly name: string;
    private readonly client;
    private readonly prefixer;
    private readonly prefixRegex;
    private readonly directory;
    constructor(name: string, client: RedisClient, parentLog: Logger);
    getDirectory(): string;
    get(key: string): Promise<string>;
    set(key: string, value: string, ttlSeconds?: number): Promise<void>;
    increment(key: string, incrementBy?: number, ttlSeconds?: number): Promise<number>;
    decrement(key: string, decrementBy?: number, ttlSeconds?: number): Promise<number>;
    setIfNotExistsAlready(key: string, value: string): Promise<boolean>;
    delete(key: string): Promise<number>;
    hget(key: string, field: string): Promise<string>;
    hset(key: string, field: string, value: string): Promise<number>;
    hgetall(key: string): Promise<{
        [key: string]: string;
    }>;
    private deleteByPattern;
    deleteByKeyPattern(keyPattern: string): Promise<number>;
    deleteAll(): Promise<number>;
    getKeys(pattern: string, removeCacheName?: boolean): Promise<string[]>;
    getAllValues(): Promise<Map<string, string>>;
    getValueByKeyPattern(keyPattern: string, removeCacheName?: boolean): Promise<Map<string, string>>;
}
//# sourceMappingURL=cache.d.ts.map