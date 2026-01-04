"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const devtelWorkspaceService_1 = __importDefault(require("../../../services/devtel/devtelWorkspaceService"));
/**
 * GET /tenant/{tenantId}/devtel/capacity
 * @summary Get capacity overview for all team members
 * @tag DevTel Capacity
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberRead);
    const workspaceService = new devtelWorkspaceService_1.default(req);
    const workspace = await workspaceService.getForCurrentTenant();
    // Get all users with their assigned hours
    const users = await req.database.users.findAll({
        where: { tenantId: req.currentTenant.id },
        attributes: ['id', 'fullName', 'email', 'firstName', 'lastName'],
    });
    // Get assignments for each user
    const userIds = users.map(u => u.id);
    const assignments = await req.database.devtelIssueAssignments.findAll({
        where: { userId: userIds },
        include: [
            {
                model: req.database.devtelIssues,
                as: 'issue',
                where: { deletedAt: null },
                attributes: ['id', 'title', 'status', 'estimatedHours', 'cycleId'],
                include: [
                    {
                        model: req.database.devtelCycles,
                        as: 'cycle',
                        attributes: ['id', 'name', 'startDate', 'endDate', 'status'],
                    },
                ],
            },
        ],
    });
    // Group assignments by user
    const userCapacity = users.map(user => {
        const userAssignments = assignments.filter(a => a.userId === user.id);
        const totalAllocatedHours = userAssignments.reduce((sum, a) => sum + (parseFloat(a.allocatedHours) || 0), 0);
        const activeIssues = userAssignments.filter(a => { var _a, _b; return ((_a = a.issue) === null || _a === void 0 ? void 0 : _a.status) === 'in_progress' || ((_b = a.issue) === null || _b === void 0 ? void 0 : _b.status) === 'review'; });
        return {
            user: user.get({ plain: true }),
            totalAllocatedHours,
            activeIssuesCount: activeIssues.length,
            assignments: userAssignments.map(a => {
                var _a, _b, _c, _d, _e;
                return ({
                    issueId: (_a = a.issue) === null || _a === void 0 ? void 0 : _a.id,
                    issueTitle: (_b = a.issue) === null || _b === void 0 ? void 0 : _b.title,
                    issueStatus: (_c = a.issue) === null || _c === void 0 ? void 0 : _c.status,
                    allocatedHours: a.allocatedHours,
                    scheduledDate: a.scheduledDate,
                    cycleName: (_e = (_d = a.issue) === null || _d === void 0 ? void 0 : _d.cycle) === null || _e === void 0 ? void 0 : _e.name,
                });
            }),
        };
    });
    await req.responseHandler.success(req, res, {
        workspace: workspace.get({ plain: true }),
        capacity: userCapacity,
    });
};
//# sourceMappingURL=capacityOverview.js.map