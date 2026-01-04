import Permissions from '../../security/permissions'
import PermissionChecker from '../../services/user/permissionChecker'

/**
 * Dismiss an insight with a reason
 */
export default async (req, res) => {
    const payload = new Permissions(req.currentUser, req.currentTenant).edit
    const { insightId } = req.params

    const insight = await req.database.agentInsights.findOne({
        where: {
            id: insightId,
            tenantId: req.currentTenant.id,
        },
    })

    if (!insight) {
        return res.status(404).json({ error: 'Insight not found' })
    }

    if (insight.status !== 'active') {
        return res.status(400).json({ error: 'Insight has already been processed' })
    }

    // Record the dismissal
    await req.database.insightDismissals.create({
        insightId,
        userId: req.currentUser.id,
        reason: req.body.reason || 'not_relevant',
        comment: req.body.comment,
    })

    // Update insight status
    await insight.update({ status: 'dismissed' })

    await req.responseHandler.success(req, res, insight.get({ plain: true }))
}
