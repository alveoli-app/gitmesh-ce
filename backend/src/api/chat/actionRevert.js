"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../security/permissions"));
/**
 * Revert an executed action
 */
exports.default = async (req, res) => {
    var _a, _b;
    const payload = new permissions_1.default(req.currentUser, req.currentTenant).edit;
    const action = await req.database.chatExecutedActions.findOne({
        where: {
            id: req.params.actionId,
            tenantId: req.currentTenant.id,
        },
    });
    if (!action) {
        return res.status(404).json({ error: 'Action not found' });
    }
    if (!action.isReversible) {
        return res.status(400).json({ error: 'This action is not reversible' });
    }
    if (action.revertedAt) {
        return res.status(400).json({ error: 'Action has already been reverted' });
    }
    // Perform the revert based on action type
    try {
        switch (action.actionType) {
            case 'assign_issue':
                // Revert assignment - set assignee back to previous value
                const originalAssignee = ((_a = action.result) === null || _a === void 0 ? void 0 : _a.previousAssigneeId) || null;
                await req.database.devtelIssues.update({ assigneeId: originalAssignee }, { where: { id: action.affectedEntityId } });
                break;
            case 'update_issue':
                // Revert update - restore previous values
                if ((_b = action.result) === null || _b === void 0 ? void 0 : _b.previousValues) {
                    await req.database.devtelIssues.update(action.result.previousValues, { where: { id: action.affectedEntityId } });
                }
                break;
            default:
                return res.status(400).json({
                    error: `Revert not implemented for action type: ${action.actionType}`
                });
        }
        // Mark action as reverted
        await action.update({
            revertedAt: new Date(),
            revertedBy: req.currentUser.id,
        });
        await req.responseHandler.success(req, res, action.get({ plain: true }));
    }
    catch (error) {
        req.log.error('Failed to revert action:', error);
        return res.status(500).json({ error: `Failed to revert: ${error.message}` });
    }
};
//# sourceMappingURL=actionRevert.js.map