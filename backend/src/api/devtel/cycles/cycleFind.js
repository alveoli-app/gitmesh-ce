"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const devtelCycleService_1 = __importDefault(require("../../../services/devtel/devtelCycleService"));
/**
 * GET /tenant/{tenantId}/devtel/projects/:projectId/cycles/:cycleId
 * @summary Get cycle by ID with stats
 * @tag DevTel Cycles
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberRead);
    const service = new devtelCycleService_1.default(req);
    const cycle = await service.findById(req.params.projectId, req.params.cycleId);
    await req.responseHandler.success(req, res, cycle);
};
//# sourceMappingURL=cycleFind.js.map