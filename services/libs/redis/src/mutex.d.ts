import { RedisClient } from './types';
export declare const acquireLock: (client: RedisClient, key: string, value: string, expireAfterSeconds: number, timeoutAfterSeconds: number) => Promise<void>;
export declare const releaseLock: (client: RedisClient, key: string, value: string) => Promise<void>;
export declare const processWithLock: <T>(client: RedisClient, key: string, expireAfterSeconds: number, timeoutAfterSeconds: number, process: () => Promise<T>) => Promise<T>;
//# sourceMappingURL=mutex.d.ts.map