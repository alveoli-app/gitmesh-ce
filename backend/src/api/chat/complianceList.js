"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../services/user/permissionChecker"));
/**
 * List compliance exports
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberRead);
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const exports = await req.database.complianceExports.findAndCountAll({
        where: {
            tenantId: req.currentTenant.id,
        },
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        include: [
            {
                model: req.database.user,
                as: 'generator',
                attributes: ['id', 'fullName'],
            },
        ],
    });
    await req.responseHandler.success(req, res, {
        rows: exports.rows.map((e) => e.get({ plain: true })),
        count: exports.count,
    });
};
//# sourceMappingURL=complianceList.js.map