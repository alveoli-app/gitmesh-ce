"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantMiddleware = tenantMiddleware;
const tenantService_1 = __importDefault(require("../services/tenantService"));
async function tenantMiddleware(req, res, next, value) {
    try {
        const tenant = await new tenantService_1.default(req).findById(value);
        req.currentTenant = tenant;
        next();
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=tenantMiddleware.js.map