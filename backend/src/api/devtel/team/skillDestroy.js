"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const common_1 = require("@gitmesh/common");
/**
 * DELETE /tenant/{tenantId}/devtel/team/:userId/skills/:skillId
 * @summary Remove a skill from a team member
 * @tag DevTel Team
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberEdit);
    const { skillId } = req.params;
    const skill = await req.database.devtelUserSkills.findByPk(skillId);
    if (!skill) {
        throw new common_1.Error400(req.language, 'devtel.skill.notFound');
    }
    await skill.destroy();
    await req.responseHandler.success(req, res, { success: true });
};
//# sourceMappingURL=skillDestroy.js.map