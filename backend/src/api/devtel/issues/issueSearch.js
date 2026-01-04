"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const devtelIssueService_1 = __importDefault(require("../../../services/devtel/devtelIssueService"));
/**
 * POST /tenant/{tenantId}/devtel/projects/:projectId/issues/search
 * @summary Search issues with OpenSearch
 * @tag DevTel Issues
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberRead);
    const service = new devtelIssueService_1.default(req);
    // For now, use the list method with search params
    // TODO: Implement OpenSearch query when ready
    const result = await service.list(req.params.projectId, Object.assign(Object.assign({}, req.body), { limit: req.body.limit || 50, offset: req.body.offset || 0 }));
    await req.responseHandler.success(req, res, result);
};
//# sourceMappingURL=issueSearch.js.map