"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const devtelIssueService_1 = __importDefault(require("../../../services/devtel/devtelIssueService"));
/**
 * GET /tenant/{tenantId}/devtel/projects/:projectId/issues
 * @summary List issues for a project
 * @tag DevTel Issues
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberRead);
    console.log('API issueList called', {
        projectId: req.params.projectId,
        query: req.query
    });
    const service = new devtelIssueService_1.default(req);
    const result = await service.list(req.params.projectId, {
        status: req.query.status ? req.query.status.split(',') : undefined,
        priority: req.query.priority ? req.query.priority.split(',') : undefined,
        assigneeIds: req.query.assigneeIds ? req.query.assigneeIds.split(',') : undefined,
        cycleId: req.query.cycleId,
        hasNoCycle: req.query.hasNoCycle === 'true',
        limit: parseInt(req.query.limit, 10) || 50,
        offset: parseInt(req.query.offset, 10) || 0,
        orderBy: req.query.orderBy,
        orderDirection: req.query.orderDirection,
    });
    await req.responseHandler.success(req, res, result);
};
//# sourceMappingURL=issueList.js.map