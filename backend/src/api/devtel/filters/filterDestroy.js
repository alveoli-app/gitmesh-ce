"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const common_1 = require("@gitmesh/common");
/**
 * DELETE /tenant/{tenantId}/devtel/filters/:filterId
 * @summary Delete a saved filter
 * @tag DevTel Filters
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberDestroy);
    const { filterId } = req.params;
    const filter = await req.database.devtelUserSavedFilters.findOne({
        where: {
            id: filterId,
            userId: req.currentUser.id,
        },
    });
    if (!filter) {
        throw new common_1.Error400(req.language, 'devtel.filter.notFound');
    }
    await filter.destroy();
    await req.responseHandler.success(req, res, { success: true });
};
//# sourceMappingURL=filterDestroy.js.map