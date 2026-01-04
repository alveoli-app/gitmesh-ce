"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const devtelWorkspaceService_1 = __importDefault(require("../../../services/devtel/devtelWorkspaceService"));
/**
 * GET /tenant/{tenantId}/devtel/team/analytics
 * @summary Get team analytics
 * @tag DevTel Team
 * @security Bearer
 */
exports.default = async (req, res) => {
    try {
        new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberRead);
        const workspaceService = new devtelWorkspaceService_1.default(req);
        const workspace = await workspaceService.getForCurrentTenant();
        // Get completed issues by user in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const completedByUser = await req.database.devtelIssues.findAll({
            where: {
                status: 'done',
                updatedAt: { [req.database.Sequelize.Op.gte]: thirtyDaysAgo },
                deletedAt: null,
            },
            attributes: [
                'assigneeId',
                [req.database.sequelize.fn('COUNT', '*'), 'count'],
                [req.database.sequelize.fn('SUM', req.database.sequelize.col('storyPoints')), 'points'],
            ],
            group: ['assigneeId'],
            raw: true,
        });
        // Get users
        const users = await req.database.user.findAll({
            include: [
                {
                    model: req.database.tenantUser,
                    as: 'tenants',
                    where: { tenantId: req.currentTenant.id },
                    attributes: [],
                },
            ],
            attributes: ['id', 'fullName', 'email'],
        });
        const userMap = users.reduce((acc, u) => {
            acc[u.id] = u.get({ plain: true });
            return acc;
        }, {});
        const analytics = {
            period: '30 days',
            completionsByUser: completedByUser.map((item) => ({
                user: userMap[item.assigneeId] || { id: item.assigneeId },
                completedCount: parseInt(item.count, 10),
                storyPoints: parseInt(item.points, 10) || 0,
            })),
            totalCompleted: completedByUser.reduce((sum, item) => sum + parseInt(item.count, 10), 0),
            totalPoints: completedByUser.reduce((sum, item) => sum + (parseInt(item.points, 10) || 0), 0),
        };
        await req.responseHandler.success(req, res, analytics);
    }
    catch (error) {
        console.error('Team Analytics Error:', error.message);
        throw error;
    }
};
//# sourceMappingURL=teamAnalytics.js.map