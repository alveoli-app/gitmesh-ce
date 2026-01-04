"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const common_1 = require("@gitmesh/common");
/**
 * PUT /tenant/{tenantId}/devtel/capacity/assignments/:assignmentId
 * @summary Update an issue assignment
 * @tag DevTel Capacity
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberEdit);
    const { assignmentId } = req.params;
    const { allocatedHours, scheduledDate } = req.body;
    const assignment = await req.database.devtelIssueAssignments.findByPk(assignmentId);
    if (!assignment) {
        throw new common_1.Error400(req.language, 'devtel.assignment.notFound');
    }
    const updateData = {};
    if (allocatedHours !== undefined)
        updateData.allocatedHours = allocatedHours;
    if (scheduledDate !== undefined)
        updateData.scheduledDate = scheduledDate;
    await assignment.update(updateData);
    // Return updated assignment with relations
    const updated = await req.database.devtelIssueAssignments.findOne({
        where: { id: assignmentId },
        include: [
            {
                model: req.database.users,
                as: 'user',
                attributes: ['id', 'fullName', 'email'],
            },
            {
                model: req.database.devtelIssues,
                as: 'issue',
                attributes: ['id', 'title', 'status'],
            },
        ],
    });
    await req.responseHandler.success(req, res, updated);
};
//# sourceMappingURL=assignmentUpdate.js.map