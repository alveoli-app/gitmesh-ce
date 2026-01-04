"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const devtelProjectService_1 = __importDefault(require("../../../services/devtel/devtelProjectService"));
/**
 * GET /tenant/{tenantId}/devtel/projects
 * @summary List all projects in workspace
 * @tag DevTel Projects
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberRead);
    const service = new devtelProjectService_1.default(req);
    const result = await service.list({
        status: req.query.status,
        limit: parseInt(req.query.limit, 10) || 50,
        offset: parseInt(req.query.offset, 10) || 0,
    });
    await req.responseHandler.success(req, res, result);
};
//# sourceMappingURL=projectList.js.map