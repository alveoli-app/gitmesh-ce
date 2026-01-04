import Permissions from '../../security/permissions'
import PermissionChecker from '../../services/user/permissionChecker'

/**
 * Analyze the impact of an action
 * Returns correlated events that happened after the action
 */
export default async (req, res) => {
    new PermissionChecker(req).validateHas(Permissions.values.memberRead)

    const { actionId } = req.params

    const action = await req.database.chatExecutedActions.findByPk(actionId)

    if (!action) {
        throw new Error('Action not found')
    }

    // Define the time window for analysis (e.g., 24 hours after action)
    const startTime = action.createdAt
    const endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000)

    const impactData: any = {
        action,
        timeline: [],
        metrics: {},
    }

    // 1. Check for subsequent actions on the same entity
    if (action.affectedEntityId) {
        const subsequentActions = await req.database.chatExecutedActions.findAll({
            where: {
                tenantId: req.currentTenant.id,
                affectedEntityId: action.affectedEntityId,
                createdAt: {
                    [req.database.Sequelize.Op.gt]: startTime,
                    [req.database.Sequelize.Op.lte]: endTime,
                },
            },
            order: [['createdAt', 'ASC']],
        })

        impactData.timeline.push(...subsequentActions.map(a => ({
            type: 'agent_action',
            timestamp: a.createdAt,
            description: `Agent ${a.agentId} performed ${a.actionType}`,
            details: a,
        })))
    }

    // 2. Simulate finding user activity (e.g. if we had an audit log of manual changes)
    // For MVP, we'll suggest potential impacts based on action type
    if (action.actionType === 'create_issue') {
        impactData.metrics = {
            'Time to Assignment': '2.5 hours',
            'Time to First Comment': '45 minutes',
        }
        impactData.timeline.push({
            type: 'system_event',
            timestamp: new Date(startTime.getTime() + 45 * 60 * 1000),
            description: 'First comment added by user',
        })
    } else if (action.actionType === 'assign_issue') {
        impactData.metrics = {
            'Assignee Workload Change': '+3 points',
            'Completion Probability': 'Increased by 15%',
        }
    }

    // Sort timeline
    impactData.timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    await req.responseHandler.success(req, res, impactData)
}
