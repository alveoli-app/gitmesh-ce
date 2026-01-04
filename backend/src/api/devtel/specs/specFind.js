"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const common_1 = require("@gitmesh/common");
/**
 * GET /tenant/{tenantId}/devtel/projects/:projectId/specs/:specId
 * @summary Get spec document by ID
 * @tag DevTel Specs
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberRead);
    const { specId, projectId } = req.params;
    const spec = await req.database.devtelSpecDocuments.findOne({
        where: {
            id: specId,
            projectId,
            deletedAt: null,
        },
        include: [
            {
                model: req.database.users,
                as: 'author',
                attributes: ['id', 'fullName', 'email', 'firstName', 'lastName'],
            },
        ],
    });
    if (!spec) {
        throw new common_1.Error400(req.language, 'devtel.spec.notFound');
    }
    await req.responseHandler.success(req, res, spec);
};
//# sourceMappingURL=specFind.js.map