import Permissions from '../../../security/permissions'
import PermissionChecker from '../../../services/user/permissionChecker'
import { Error400 } from '@gitmesh/common'

/**
 * PUT /tenant/{tenantId}/devtel/capacity/assignments/:assignmentId
 * @summary Update an issue assignment
 * @tag DevTel Capacity
 * @security Bearer
 */
export default async (req, res) => {
    new PermissionChecker(req).validateHas(Permissions.values.memberEdit)

    const { assignmentId } = req.params
    const { allocatedHours, scheduledDate } = req.body

    const assignment = await req.database.devtelIssueAssignments.findByPk(assignmentId)

    if (!assignment) {
        throw new Error400(req.language, 'devtel.assignment.notFound')
    }

    const updateData: any = {}
    if (allocatedHours !== undefined) updateData.allocatedHours = allocatedHours
    if (scheduledDate !== undefined) updateData.scheduledDate = scheduledDate

    await assignment.update(updateData)

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
    })

    await req.responseHandler.success(req, res, updated)
}
