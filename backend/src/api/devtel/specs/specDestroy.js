"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const common_1 = require("@gitmesh/common");
/**
 * DELETE /tenant/{tenantId}/devtel/projects/:projectId/specs/:specId
 * @summary Delete a spec document
 * @tag DevTel Specs
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberDestroy);
    const { specId, projectId } = req.params;
    const spec = await req.database.devtelSpecDocuments.findOne({
        where: {
            id: specId,
            projectId,
            deletedAt: null,
        },
    });
    if (!spec) {
        throw new common_1.Error400(req.language, 'devtel.spec.notFound');
    }
    await spec.update({
        deletedAt: new Date(),
        updatedById: req.currentUser.id,
    });
    await req.responseHandler.success(req, res, { success: true });
};
//# sourceMappingURL=specDestroy.js.map