import Permissions from '../../security/permissions'
import PermissionChecker from '../../services/user/permissionChecker'

/**
 * Revert an executed action
 */
export default async (req, res) => {
    const payload = new Permissions(req.currentUser, req.currentTenant).edit

    const action = await req.database.chatExecutedActions.findOne({
        where: {
            id: req.params.actionId,
            tenantId: req.currentTenant.id,
        },
    })

    if (!action) {
        return res.status(404).json({ error: 'Action not found' })
    }

    if (!action.isReversible) {
        return res.status(400).json({ error: 'This action is not reversible' })
    }

    if (action.revertedAt) {
        return res.status(400).json({ error: 'Action has already been reverted' })
    }

    // Perform the revert based on action type
    try {
        switch (action.actionType) {
            case 'assign_issue':
                // Revert assignment - set assignee back to previous value
                const originalAssignee = action.result?.previousAssigneeId || null
                await req.database.devtelIssues.update(
                    { assigneeId: originalAssignee },
                    { where: { id: action.affectedEntityId } }
                )
                break

            case 'update_issue':
                // Revert update - restore previous values
                if (action.result?.previousValues) {
                    await req.database.devtelIssues.update(
                        action.result.previousValues,
                        { where: { id: action.affectedEntityId } }
                    )
                }
                break

            default:
                return res.status(400).json({
                    error: `Revert not implemented for action type: ${action.actionType}`
                })
        }

        // Mark action as reverted
        await action.update({
            revertedAt: new Date(),
            revertedBy: req.currentUser.id,
        })

        await req.responseHandler.success(req, res, action.get({ plain: true }))

    } catch (error: any) {
        req.log.error('Failed to revert action:', error)
        return res.status(500).json({ error: `Failed to revert: ${error.message}` })
    }
}
