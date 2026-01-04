"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const devtelCycleService_1 = __importDefault(require("../../../services/devtel/devtelCycleService"));
const common_1 = require("@gitmesh/common");
/**
 * POST /tenant/{tenantId}/devtel/projects/:projectId/cycles/:cycleId/plan
 * @summary Plan sprint - move issues into a cycle
 * @tag DevTel Cycles
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberEdit);
    const { issueIds } = req.body;
    if (!issueIds || !Array.isArray(issueIds) || issueIds.length === 0) {
        throw new common_1.Error400(req.language, 'devtel.cycle.issueIdsRequired');
    }
    const service = new devtelCycleService_1.default(req);
    const cycle = await service.planSprint(req.params.projectId, req.params.cycleId, issueIds);
    await req.responseHandler.success(req, res, cycle);
};
//# sourceMappingURL=cyclePlan.js.map