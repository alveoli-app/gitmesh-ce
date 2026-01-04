"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
/**
 * POST /tenant/{tenantId}/devtel/projects/:projectId/specs/search
 * @summary Search spec documents
 * @tag DevTel Specs
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberRead);
    const { projectId } = req.params;
    const { query, status, limit = 50, offset = 0 } = req.body;
    // For now, do a simple ILIKE search
    // TODO: Implement OpenSearch when ready
    const { Op } = require('sequelize');
    const where = {
        projectId,
        deletedAt: null,
    };
    if (query) {
        where.title = { [Op.iLike]: `%${query}%` };
    }
    if (status) {
        where.status = status;
    }
    const { rows, count } = await req.database.devtelSpecDocuments.findAndCountAll({
        where,
        include: [
            {
                model: req.database.user,
                as: 'author',
                attributes: ['id', 'fullName', 'email'],
            },
        ],
        order: [['updatedAt', 'DESC']],
        limit,
        offset,
    });
    await req.responseHandler.success(req, res, { rows, count });
};
//# sourceMappingURL=specSearch.js.map