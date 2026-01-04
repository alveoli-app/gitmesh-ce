"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissionChecker_1 = __importDefault(require("../../services/user/permissionChecker"));
const permissions_1 = __importDefault(require("../../security/permissions"));
const materializedViewService_1 = __importDefault(require("../../services/materializedViewService"));
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.organizationRead);
    const materializedViewService = new materializedViewService_1.default(req);
    // Refresh the materialized views that contain organization counts
    await materializedViewService.refreshActivityCube();
    await materializedViewService.refreshOrganizationCube();
    await req.responseHandler.success(req, res, { message: 'Organization counts refreshed successfully' });
};
//# sourceMappingURL=organizationRefreshCounts.js.map