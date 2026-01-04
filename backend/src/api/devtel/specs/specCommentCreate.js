"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const common_1 = require("@gitmesh/common");
/**
 * POST /tenant/{tenantId}/devtel/projects/:projectId/specs/:specId/comments
 * @summary Add a comment to a spec
 * @tag DevTel Specs
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberCreate);
    const { specId } = req.params;
    const { content, textReference } = req.body;
    if (!content || typeof content !== 'string') {
        throw new common_1.Error400(req.language, 'devtel.comment.contentRequired');
    }
    const comment = await req.database.devtelSpecComments.create({
        specId,
        authorId: req.currentUser.id,
        content,
        textReference,
        resolved: false,
    });
    const result = await req.database.devtelSpecComments.findOne({
        where: { id: comment.id },
        include: [
            {
                model: req.database.user,
                as: 'author',
                attributes: ['id', 'fullName', 'email'],
            },
        ],
    });
    await req.responseHandler.success(req, res, result);
};
//# sourceMappingURL=specCommentCreate.js.map