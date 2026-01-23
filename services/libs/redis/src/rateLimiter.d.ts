import { ICache, IRateLimiter, IConcurrentRequestLimiter } from '@gitmesh/types';
export declare class RateLimiter implements IRateLimiter {
    private readonly cache;
    private readonly maxRequests;
    private readonly timeWindowSeconds;
    private readonly counterKey;
    constructor(cache: ICache, maxRequests: number, timeWindowSeconds: number, counterKey: string);
    checkRateLimit(endpoint: string): Promise<void>;
    incrementRateLimit(): Promise<void>;
}
export declare class ConcurrentRequestLimiter implements IConcurrentRequestLimiter {
    private readonly cache;
    private readonly maxConcurrentRequests;
    private readonly requestKey;
    private readonly maxLockTimeSeconds;
    constructor(cache: ICache, maxConcurrentRequests: number, requestKey: string, maxLockTimeSeconds?: number);
    checkConcurrentRequestLimit(integrationId: string, retries?: number, sleepTimeMs?: number): Promise<void>;
    incrementConcurrentRequest(integrationId: string): Promise<void>;
    decrementConcurrentRequest(integrationId: string): Promise<void>;
    processWithLimit<T>(integrationId: string, func: () => Promise<T>): Promise<T>;
    private getRequestKey;
}
//# sourceMappingURL=rateLimiter.d.ts.map