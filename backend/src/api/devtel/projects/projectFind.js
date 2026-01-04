"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const devtelProjectService_1 = __importDefault(require("../../../services/devtel/devtelProjectService"));
/**
 * GET /tenant/{tenantId}/devtel/projects/:projectId
 * @summary Get project by ID
 * @tag DevTel Projects
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberRead);
    const service = new devtelProjectService_1.default(req);
    const project = await service.findById(req.params.projectId);
    await req.responseHandler.success(req, res, project);
};
//# sourceMappingURL=projectFind.js.map