"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const common_1 = require("@gitmesh/common");
/**
 * PUT /tenant/{tenantId}/devtel/projects/:projectId/specs/:specId
 * @summary Update a spec document
 * @tag DevTel Specs
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberEdit);
    const { specId, projectId } = req.params;
    const { title, content, status } = req.body;
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
    const updateData = { updatedById: req.currentUser.id };
    if (title !== undefined)
        updateData.title = title;
    if (status !== undefined)
        updateData.status = status;
    // If content changed, save a new version
    if (content !== undefined) {
        updateData.content = content;
        // Get version count for comparison
        const latestVersion = await req.database.devtelSpecVersions.findOne({
            where: { specId },
            order: [['createdAt', 'DESC']],
        });
        // Only save new version if content actually changed
        if (JSON.stringify(latestVersion === null || latestVersion === void 0 ? void 0 : latestVersion.content) !== JSON.stringify(content)) {
            await req.database.devtelSpecVersions.create({
                specId,
                authorId: req.currentUser.id,
                content,
            });
        }
    }
    await spec.update(updateData);
    const result = await req.database.devtelSpecDocuments.findOne({
        where: { id: specId },
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
//# sourceMappingURL=specUpdate.js.map