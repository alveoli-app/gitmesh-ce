"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const devtelCycleService_1 = __importDefault(require("../../../services/devtel/devtelCycleService"));
/**
 * PUT /tenant/{tenantId}/devtel/projects/:projectId/cycles/:cycleId
 * @summary Update a cycle
 * @tag DevTel Cycles
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberEdit);
    const service = new devtelCycleService_1.default(req);
    const cycle = await service.update(req.params.projectId, req.params.cycleId, req.body.data || req.body);
    await req.responseHandler.success(req, res, cycle);
};
//# sourceMappingURL=cycleUpdate.js.map