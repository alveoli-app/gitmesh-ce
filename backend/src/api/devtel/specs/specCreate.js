"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const common_1 = require("@gitmesh/common");
/**
 * POST /tenant/{tenantId}/devtel/projects/:projectId/specs
 * @summary Create a new spec document
 * @tag DevTel Specs
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberCreate);
    const { projectId } = req.params;
    const { title, content, status = 'draft' } = req.body;
    if (!title || typeof title !== 'string') {
        throw new common_1.Error400(req.language, 'devtel.spec.titleRequired');
    }
    const spec = await req.database.devtelSpecDocuments.create({
        projectId,
        authorId: req.currentUser.id,
        title,
        content: content || {},
        status,
        createdById: req.currentUser.id,
    });
    // Create initial version
    await req.database.devtelSpecVersions.create({
        specId: spec.id,
        authorId: req.currentUser.id,
        content: content || {},
    });
    const result = await req.database.devtelSpecDocuments.findOne({
        where: { id: spec.id },
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
//# sourceMappingURL=specCreate.js.map