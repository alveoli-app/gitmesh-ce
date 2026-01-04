"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const devtelIssueService_1 = __importDefault(require("../../../services/devtel/devtelIssueService"));
/**
 * GET /tenant/{tenantId}/devtel/projects/:projectId/issues/:issueId
 * @summary Get issue by ID
 * @tag DevTel Issues
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberRead);
    const service = new devtelIssueService_1.default(req);
    const issue = await service.findById(req.params.projectId, req.params.issueId);
    await req.responseHandler.success(req, res, issue);
};
//# sourceMappingURL=issueFind.js.map