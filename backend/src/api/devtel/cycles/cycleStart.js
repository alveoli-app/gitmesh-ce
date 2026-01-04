"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const devtelCycleService_1 = __importDefault(require("../../../services/devtel/devtelCycleService"));
/**
 * POST /tenant/{tenantId}/devtel/projects/:projectId/cycles/:cycleId/start
 * @summary Start a cycle (transition from planned to active)
 * @tag DevTel Cycles
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberEdit);
    const service = new devtelCycleService_1.default(req);
    const cycle = await service.start(req.params.projectId, req.params.cycleId);
    await req.responseHandler.success(req, res, cycle);
};
//# sourceMappingURL=cycleStart.js.map