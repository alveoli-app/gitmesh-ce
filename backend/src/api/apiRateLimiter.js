"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimiter = createRateLimiter;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
function createRateLimiter({ max, windowMs, message, }) {
    return (0, express_rate_limit_1.default)({
        max,
        windowMs,
        message,
        skip: (req) => {
            if (req.method === 'OPTIONS') {
                return true;
            }
            if (req.originalUrl.endsWith('/import')) {
                return true;
            }
            return false;
        },
    });
}
//# sourceMappingURL=apiRateLimiter.js.map