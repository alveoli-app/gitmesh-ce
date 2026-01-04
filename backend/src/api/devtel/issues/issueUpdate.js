"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const devtelIssueService_1 = __importDefault(require("../../../services/devtel/devtelIssueService"));
/**
 * PUT /tenant/{tenantId}/devtel/projects/:projectId/issues/:issueId
 * @summary Update an issue
 * @tag DevTel Issues
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberEdit);
    const service = new devtelIssueService_1.default(req);
    const issue = await service.update(req.params.projectId, req.params.issueId, req.body.data || req.body);
    await req.responseHandler.success(req, res, issue);
};
//# sourceMappingURL=issueUpdate.js.map