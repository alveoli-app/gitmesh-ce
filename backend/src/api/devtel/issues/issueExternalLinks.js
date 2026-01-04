"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const common_1 = require("@gitmesh/common");
/**
 * GET /tenant/{tenantId}/devtel/issues/:issueId/external-links
 * @summary Get external links (PRs, etc.) for an issue
 * @tag DevTel Issues
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberRead);
    const { issueId } = req.params;
    // Get issue to verify it exists and belongs to tenant's workspace
    const issue = await req.database.devtelIssues.findByPk(issueId, {
        include: [{
                model: req.database.devtelProjects,
                as: 'project',
                include: [{
                        model: req.database.devtelWorkspaces,
                        as: 'workspace',
                        where: { tenantId: req.currentTenant.id },
                    }],
            }],
    });
    if (!issue) {
        throw new common_1.Error400(req.language, 'devtel.issue.notFound');
    }
    // Fetch external links
    const links = await req.database.devtelExternalLinks.findAll({
        where: {
            linkableType: 'issue',
            linkableId: issueId,
        },
        order: [['createdAt', 'DESC']],
    });
    const formattedLinks = links.map(link => {
        var _a, _b, _c, _d, _e;
        return ({
            id: link.id,
            externalType: link.externalType,
            externalId: link.externalId,
            url: link.url,
            metadata: link.metadata,
            status: (_a = link.metadata) === null || _a === void 0 ? void 0 : _a.status,
            merged: (_b = link.metadata) === null || _b === void 0 ? void 0 : _b.merged,
            title: (_c = link.metadata) === null || _c === void 0 ? void 0 : _c.title,
            author: (_d = link.metadata) === null || _d === void 0 ? void 0 : _d.author,
            repository: (_e = link.metadata) === null || _e === void 0 ? void 0 : _e.repository,
            createdAt: link.createdAt,
            updatedAt: link.updatedAt,
        });
    });
    await req.responseHandler.success(req, res, { links: formattedLinks });
};
//# sourceMappingURL=issueExternalLinks.js.map