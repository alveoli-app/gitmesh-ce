"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
/**
 * GET /tenant/{tenantId}/devtel/projects/:projectId/specs
 * @summary List spec documents for a project
 * @tag DevTel Specs
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberRead);
    const { projectId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;
    const where = {
        projectId,
        deletedAt: null,
    };
    if (status) {
        where.status = status;
    }
    const { rows, count } = await req.database.devtelSpecDocuments.findAndCountAll({
        where,
        include: [
            {
                model: req.database.user,
                as: 'author',
                attributes: ['id', 'fullName', 'email', 'firstName', 'lastName'],
            },
        ],
        order: [['updatedAt', 'DESC']],
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
    });
    await req.responseHandler.success(req, res, { rows, count });
};
//# sourceMappingURL=specList.js.map