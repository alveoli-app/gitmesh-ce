"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const common_1 = require("@gitmesh/common");
/**
 * POST /tenant/{tenantId}/devtel/projects/:projectId/issues/:issueId/comments
 * @summary Create a comment on an issue
 * @tag DevTel Issues
 * @security Bearer
 */
exports.default = async (req, res) => {
    var _a;
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberCreate);
    const { issueId, projectId } = req.params;
    const { content } = req.body;
    if (!content || typeof content !== 'string') {
        throw new common_1.Error400(req.language, 'devtel.comment.contentRequired');
    }
    // Create comment
    const comment = await req.database.devtelIssueComments.create({
        issueId,
        authorId: req.currentUser.id,
        content,
    });
    // Fetch with author info
    const result = await req.database.devtelIssueComments.findOne({
        where: { id: comment.id },
        include: [
            {
                model: req.database.user,
                as: 'author',
                attributes: ['id', 'fullName', 'email', 'firstName', 'lastName'],
            },
        ],
    });
    // Broadcast via Socket.IO
    if ((_a = req.io) === null || _a === void 0 ? void 0 : _a.devtel) {
        req.io.devtel.emitCommentAdded(req.params.projectId, req.params.issueId, comment);
    }
    await req.responseHandler.success(req, res, comment);
};
//# sourceMappingURL=issueCommentCreate.js.map