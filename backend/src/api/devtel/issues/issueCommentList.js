"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
/**
 * GET /tenant/{tenantId}/devtel/projects/:projectId/issues/:issueId/comments
 * @summary List comments for an issue
 * @tag DevTel Issues
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberRead);
    const { issueId } = req.params;
    const comments = await req.database.devtelIssueComments.findAll({
        where: {
            issueId,
            deletedAt: null,
        },
        include: [
            {
                model: req.database.user,
                as: 'author',
                attributes: ['id', 'fullName', 'email', 'firstName', 'lastName'],
            },
        ],
        order: [['createdAt', 'ASC']],
    });
    await req.responseHandler.success(req, res, comments);
};
//# sourceMappingURL=issueCommentList.js.map