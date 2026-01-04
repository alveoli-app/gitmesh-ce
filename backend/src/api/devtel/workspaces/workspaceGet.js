"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const devtelWorkspaceService_1 = __importDefault(require("../../../services/devtel/devtelWorkspaceService"));
/**
 * GET /tenant/{tenantId}/devtel/workspace
 * @summary Get or create DevTel workspace for current tenant
 * @tag DevTel
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberRead);
    const service = new devtelWorkspaceService_1.default(req);
    const workspace = await service.getOrCreate();
    await req.responseHandler.success(req, res, workspace);
};
//# sourceMappingURL=workspaceGet.js.map