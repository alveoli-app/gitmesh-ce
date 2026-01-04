import Permissions from '../../security/permissions'
import PermissionChecker from '../../services/user/permissionChecker'

/**
 * Mark an insight as resolved
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

    // Update insight status
    await insight.update({
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: req.currentUser.id,
    })

    await req.responseHandler.success(req, res, insight.get({ plain: true }))
}
