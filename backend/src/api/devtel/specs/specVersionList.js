"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
/**
 * GET /tenant/{tenantId}/devtel/projects/:projectId/specs/:specId/versions
 * @summary Get version history for a spec
 * @tag DevTel Specs
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberRead);
    const { specId } = req.params;
    const versions = await req.database.devtelSpecVersions.findAll({
        where: { specId },
        include: [
            {
                model: req.database.user,
                as: 'author',
                attributes: ['id', 'fullName', 'email', 'firstName', 'lastName'],
            },
        ],
        order: [['createdAt', 'DESC']],
    });
    await req.responseHandler.success(req, res, versions);
};
//# sourceMappingURL=specVersionList.js.map