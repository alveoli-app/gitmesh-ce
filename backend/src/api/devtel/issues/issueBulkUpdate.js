"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const devtelIssueService_1 = __importDefault(require("../../../services/devtel/devtelIssueService"));
/**
 * PATCH /tenant/{tenantId}/devtel/projects/:projectId/issues/bulk
 * @summary Bulk update issues
 * @tag DevTel Issues
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberEdit);
    const _a = req.body, { issueIds } = _a, updateData = __rest(_a, ["issueIds"]);
    if (!issueIds || !Array.isArray(issueIds) || issueIds.length === 0) {
        return req.responseHandler.error(req, res, { message: 'issueIds array is required' }, 400);
    }
    const service = new devtelIssueService_1.default(req);
    const results = await service.bulkUpdate(req.params.projectId, issueIds, updateData);
    await req.responseHandler.success(req, res, results);
};
//# sourceMappingURL=issueBulkUpdate.js.map