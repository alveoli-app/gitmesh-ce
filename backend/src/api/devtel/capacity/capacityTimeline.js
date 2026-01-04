"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const sequelize_1 = require("sequelize");
/**
 * GET /tenant/{tenantId}/devtel/capacity/timeline
 * @summary Get weekly timeline view of capacity
 * @tag DevTel Capacity
 * @security Bearer
 */
exports.default = async (req, res) => {
    var _a, _b, _c, _d, _e;
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberRead);
    const { startDate, endDate, userId } = req.query;
    // Default to current week if no dates provided
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date();
    if (!startDate) {
        start.setDate(start.getDate() - start.getDay()); // Start of week
    }
    if (!endDate) {
        end.setDate(start.getDate() + 6); // End of week
    }
    const where = {
        scheduledDate: {
            [sequelize_1.Op.between]: [start, end],
        },
    };
    if (userId) {
        where.userId = userId;
    }
    const assignments = await req.database.devtelIssueAssignments.findAll({
        where,
        include: [
            {
                model: req.database.users,
                as: 'user',
                attributes: ['id', 'fullName', 'email', 'firstName', 'lastName'],
            },
            {
                model: req.database.devtelIssues,
                as: 'issue',
                where: { deletedAt: null },
                attributes: ['id', 'title', 'status', 'priority', 'estimatedHours'],
            },
        ],
        order: [['scheduledDate', 'ASC']],
    });
    // Group by date and user
    const timeline = {};
    for (const assignment of assignments) {
        const dateKey = (_a = assignment.scheduledDate) === null || _a === void 0 ? void 0 : _a.toISOString().split('T')[0];
        if (!dateKey)
            continue;
        if (!timeline[dateKey]) {
            timeline[dateKey] = {};
        }
        const userId = assignment.userId;
        if (!timeline[dateKey][userId]) {
            timeline[dateKey][userId] = {
                user: (_b = assignment.user) === null || _b === void 0 ? void 0 : _b.get({ plain: true }),
                assignments: [],
                totalHours: 0,
            };
        }
        timeline[dateKey][userId].assignments.push({
            issueId: (_c = assignment.issue) === null || _c === void 0 ? void 0 : _c.id,
            issueTitle: (_d = assignment.issue) === null || _d === void 0 ? void 0 : _d.title,
            allocatedHours: assignment.allocatedHours,
            status: (_e = assignment.issue) === null || _e === void 0 ? void 0 : _e.status,
        });
        timeline[dateKey][userId].totalHours += parseFloat(assignment.allocatedHours) || 0;
    }
    await req.responseHandler.success(req, res, {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        timeline,
    });
};
//# sourceMappingURL=capacityTimeline.js.map