"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const devtelCycleService_1 = __importDefault(require("../../../services/devtel/devtelCycleService"));
/**
 * DELETE /tenant/{tenantId}/devtel/projects/:projectId/cycles/:cycleId
 * @summary Delete a cycle
 * @tag DevTel Cycles
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberDestroy);
    const service = new devtelCycleService_1.default(req);
    await service.destroy(req.params.projectId, req.params.cycleId);
    await req.responseHandler.success(req, res, { success: true });
};
//# sourceMappingURL=cycleDestroy.js.map