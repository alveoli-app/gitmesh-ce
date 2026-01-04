"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const devtelWorkspaceService_1 = __importDefault(require("../../../services/devtel/devtelWorkspaceService"));
const common_1 = require("@gitmesh/common");
/**
 * POST /tenant/{tenantId}/devtel/team/:userId/skills
 * @summary Add a skill to a team member
 * @tag DevTel Team
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberEdit);
    const { userId } = req.params;
    const { skill, level = 'intermediate' } = req.body;
    if (!skill || typeof skill !== 'string') {
        throw new common_1.Error400(req.language, 'devtel.skill.nameRequired');
    }
    const workspaceService = new devtelWorkspaceService_1.default(req);
    const workspace = await workspaceService.getForCurrentTenant();
    // Check if skill already exists
    const existing = await req.database.devtelUserSkills.findOne({
        where: {
            userId,
            workspaceId: workspace.id,
            skill,
        },
    });
    if (existing) {
        throw new common_1.Error400(req.language, 'devtel.skill.alreadyExists');
    }
    const userSkill = await req.database.devtelUserSkills.create({
        userId,
        workspaceId: workspace.id,
        skill,
        level,
    });
    await req.responseHandler.success(req, res, userSkill);
};
//# sourceMappingURL=skillCreate.js.map