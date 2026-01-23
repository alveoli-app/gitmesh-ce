import { Logger, LoggerBase } from '@gitmesh/logging';
import { RedisClient } from '../types';
export declare class ApiPubSubEmitter extends LoggerBase {
    private readonly pubsub;
    constructor(redis: RedisClient, parentLog: Logger);
    emitIntegrationCompleted(tenantId: string, integrationId: string, status: string): void;
    emit<T>(channel: string, data: T): void;
}
//# sourceMappingURL=apiPubSub.d.ts.map