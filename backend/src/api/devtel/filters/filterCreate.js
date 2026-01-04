"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const devtelWorkspaceService_1 = __importDefault(require("../../../services/devtel/devtelWorkspaceService"));
const common_1 = require("@gitmesh/common");
/**
 * POST /tenant/{tenantId}/devtel/filters
 * @summary Create a saved filter
 * @tag DevTel Filters
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberCreate);
    const { name, filterType, config } = req.body;
    if (!name) {
        throw new common_1.Error400(req.language, 'devtel.filter.nameRequired');
    }
    const workspaceService = new devtelWorkspaceService_1.default(req);
    const workspace = await workspaceService.getForCurrentTenant();
    const filter = await req.database.devtelUserSavedFilters.create({
        userId: req.currentUser.id,
        workspaceId: workspace.id,
        name,
        filterType: filterType || 'issues',
        config: config || {},
    });
    await req.responseHandler.success(req, res, filter);
};
//# sourceMappingURL=filterCreate.js.map