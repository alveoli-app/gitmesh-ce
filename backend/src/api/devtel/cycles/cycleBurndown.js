"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const devtelCycleService_1 = __importDefault(require("../../../services/devtel/devtelCycleService"));
/**
 * GET /tenant/{tenantId}/devtel/projects/:projectId/cycles/:cycleId/burndown
 * @summary Get burndown chart data for a cycle
 * @tag DevTel Cycles
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberRead);
    const service = new devtelCycleService_1.default(req);
    const data = await service.getBurndown(req.params.projectId, req.params.cycleId);
    await req.responseHandler.success(req, res, data);
};
//# sourceMappingURL=cycleBurndown.js.map