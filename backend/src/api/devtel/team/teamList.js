"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const devtelWorkspaceService_1 = __importDefault(require("../../../services/devtel/devtelWorkspaceService"));
/**
 * GET /tenant/{tenantId}/devtel/team
 * @summary List team members with DevTel stats
 * @tag DevTel Team
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberRead);
    const workspaceService = new devtelWorkspaceService_1.default(req);
    const workspace = await workspaceService.getForCurrentTenant();
    // Get all users in tenant
    const users = await req.database.user.findAll({
        include: [
            {
                model: req.database.tenantUser,
                as: 'tenants',
                where: { tenantId: req.currentTenant.id },
                attributes: [],
            },
        ],
        attributes: ['id', 'fullName', 'email', 'firstName', 'lastName', 'createdAt'],
    });
    // Get skills for each user
    const userIds = users.map(u => u.id);
    const skills = await req.database.devtelUserSkills.findAll({
        where: {
            userId: userIds,
            workspaceId: workspace.id,
        },
    });
    // Get issue stats per user
    const issueStats = await req.database.devtelIssues.findAll({
        where: {
            assigneeId: userIds,
            deletedAt: null,
        },
        attributes: [
            'assigneeId',
            'status',
            [req.database.sequelize.fn('COUNT', '*'), 'count'],
        ],
        group: ['assigneeId', 'status'],
        raw: true,
    });
    // Build team response
    const team = users.map(user => {
        const userSkills = skills.filter(s => s.userId === user.id);
        const userStats = issueStats.filter((s) => s.assigneeId === user.id);
        const stats = {
            total: 0,
            completed: 0,
            inProgress: 0,
        };
        userStats.forEach((s) => {
            const count = parseInt(s.count, 10);
            stats.total += count;
            if (s.status === 'done')
                stats.completed = count;
            if (s.status === 'in_progress' || s.status === 'review')
                stats.inProgress += count;
        });
        return Object.assign(Object.assign({}, user.get({ plain: true })), { skills: userSkills.map(s => ({
                id: s.id,
                skill: s.skill,
                level: s.level,
            })), issueStats: stats });
    });
    await req.responseHandler.success(req, res, { team });
};
//# sourceMappingURL=teamList.js.map