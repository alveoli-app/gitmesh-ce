import Permissions from '../../security/permissions'
import PermissionChecker from '../../services/user/permissionChecker'

/**
 * List compliance exports
 */
export default async (req, res) => {
    new PermissionChecker(req).validateHas(Permissions.values.memberRead)

    const limit = parseInt(req.query.limit) || 20
    const offset = parseInt(req.query.offset) || 0

    const exports = await req.database.complianceExports.findAndCountAll({
        where: {
            tenantId: req.currentTenant.id,
        },
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        include: [
            {
                model: req.database.user,
                as: 'generator',
                attributes: ['id', 'fullName'],
            },
        ],
    })

    await req.responseHandler.success(req, res, {
        rows: exports.rows.map((e: any) => e.get({ plain: true })),
        count: exports.count,
    })
}
