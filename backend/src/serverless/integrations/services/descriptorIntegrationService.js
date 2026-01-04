"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DescriptorIntegrationService = void 0;
const integrationServiceBase_1 = require("./integrationServiceBase");
const types_1 = require("@gitmesh/types");
const conf_1 = require("../../../conf");
const integrationRepository_1 = __importDefault(require("../../../database/repositories/integrationRepository"));
class RedisCache {
    constructor(redis) {
        this.redis = redis;
    }
    async get(key) {
        return this.redis.get(key);
    }
    async set(key, value, ttlSeconds) {
        if (ttlSeconds) {
            await this.redis.set(key, value, 'EX', ttlSeconds);
        }
        else {
            await this.redis.set(key, value);
        }
    }
    async del(key) {
        await this.redis.del(key);
    }
}
class InMemoryCache {
    constructor() {
        this.cache = new Map();
    }
    async get(key) {
        const item = this.cache.get(key);
        if (!item)
            return null;
        if (item.expiry && item.expiry < Date.now()) {
            this.cache.delete(key);
            return null;
        }
        return item.value;
    }
    async set(key, value, ttlSeconds) {
        const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0;
        this.cache.set(key, { value, expiry });
    }
    async del(key) {
        this.cache.delete(key);
    }
}
class DescriptorIntegrationService extends integrationServiceBase_1.IntegrationServiceBase {
    constructor(descriptor, redisClient) {
        super(descriptor.type, descriptor.checkEvery || 60);
        this.descriptor = descriptor;
        if (redisClient) {
            this.cache = new RedisCache(redisClient);
        }
        else {
            this.cache = new InMemoryCache();
        }
    }
    getServiceSettings() {
        return {
            nangoUrl: conf_1.NANGO_CONFIG.url,
            nangoSecretKey: conf_1.NANGO_CONFIG.secretKey,
        };
    }
    async getStreams(context) {
        const streams = [];
        const ctx = {
            onboarding: context.onboarding,
            integration: context.integration,
            log: context.logger,
            cache: this.cache,
            serviceSettings: this.getServiceSettings(),
            publishStream: async (identifier, metadata) => {
                streams.push({
                    value: identifier,
                    metadata,
                });
            },
            updateIntegrationSettings: async (settings) => {
                await integrationRepository_1.default.update(context.integration.id, { settings }, context.repoContext);
            },
            updateIntegrationToken: async (token) => {
                await integrationRepository_1.default.update(context.integration.id, { token }, context.repoContext);
            },
            updateIntegrationRefreshToken: async (refreshToken) => {
                await integrationRepository_1.default.update(context.integration.id, { refreshToken }, context.repoContext);
            },
            abortRunWithError: async (message, metadata, error) => {
                context.logger.error({ metadata, err: error }, message);
                throw new Error(message);
            },
        };
        await this.descriptor.generateStreams(ctx);
        return streams;
    }
    async processStream(stream, context) {
        const operations = [];
        const newStreams = [];
        const ctx = {
            onboarding: context.onboarding,
            integration: context.integration,
            log: context.logger,
            stream,
            cache: this.cache,
            globalCache: this.cache,
            integrationCache: this.cache,
            serviceSettings: this.getServiceSettings(),
            platformSettings: context.integration.settings,
            publishStream: async (identifier, metadata) => {
                newStreams.push({
                    value: identifier,
                    metadata,
                });
            },
            publishData: async (data) => {
                operations.push({
                    type: types_1.IntegrationResultType.DATA,
                    records: [data],
                });
            },
            updateIntegrationSettings: async (settings) => {
                await integrationRepository_1.default.update(context.integration.id, { settings }, context.repoContext);
            },
            updateIntegrationToken: async (token) => {
                await integrationRepository_1.default.update(context.integration.id, { token }, context.repoContext);
            },
            updateIntegrationRefreshToken: async (refreshToken) => {
                await integrationRepository_1.default.update(context.integration.id, { refreshToken }, context.repoContext);
            },
            abortWithError: async (message, metadata, error) => {
                context.logger.error({ metadata, err: error }, message);
                throw new Error(message);
            },
            setMessageVisibilityTimeout: async (newTimeout) => {
                // Not implemented
            },
            getDbConnection: () => {
                // Not implemented
                return null;
            },
            getRateLimiter: (maxRequests, timeWindowSeconds, cacheKey) => {
                return {
                    tryRemoveTokens: async (count) => 0,
                };
            },
            getConcurrentRequestLimiter: (maxConcurrentRequests, cacheKey) => {
                return {
                    tryAcquire: async () => true,
                    release: async () => { },
                };
            },
        };
        await this.descriptor.processStream(ctx);
        return {
            operations,
            newStreams,
        };
    }
}
exports.DescriptorIntegrationService = DescriptorIntegrationService;
//# sourceMappingURL=descriptorIntegrationService.js.map