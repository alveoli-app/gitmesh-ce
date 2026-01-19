import Permissions from '../../security/permissions'
import PermissionChecker from '../../services/user/permissionChecker'

export default async (req, res) => {
  new PermissionChecker(req).validateHas(Permissions.values.signalsContentRead)

  const { database, currentTenant } = req

  try {
    // Check GitHub integration
    const githubIntegration = await database.integration.findOne({
      where: {
        platform: 'github',
        tenantId: currentTenant.id,
      },
    })

    // Count GitHub activities
    const activityCount = await database.activity.count({
      where: {
        platform: 'github',
        tenantId: currentTenant.id,
        deletedAt: null,
      },
    })

    // Get sample activities
    const sampleActivities = await database.activity.findAll({
      where: {
        platform: 'github',
        tenantId: currentTenant.id,
        deletedAt: null,
      },
      include: [
        {
          model: database.member,
          as: 'member',
          attributes: ['id', 'displayName', 'username', 'attributes'],
        },
      ],
      order: [['timestamp', 'DESC']],
      limit: 5,
    })

    // Get user signals settings
    const tenantUser = await database.tenantUser.findOne({
      where: {
        tenantId: currentTenant.id,
        userId: req.currentUser.id,
      },
    })

    const payload = {
      githubIntegration: githubIntegration
        ? {
            id: githubIntegration.id,
            status: githubIntegration.status,
            settings: githubIntegration.settings,
          }
        : null,
      activityCount,
      sampleActivities: sampleActivities.map((a) => ({
        id: a.id,
        type: a.type,
        title: a.title,
        body: a.body?.substring(0, 100),
        url: a.url,
        timestamp: a.timestamp,
        member: a.member
          ? {
              displayName: a.member.displayName,
              username: a.member.username,
              avatarUrl: a.member.attributes?.avatarUrl,
            }
          : null,
      })),
      signalsSettings: tenantUser?.settings?.signals || null,
      externalApiConfigured: !!(process.env.SIGNALS_URL && process.env.SIGNALS_API_KEY),
    }

    await req.responseHandler.success(req, res, payload)
  } catch (error) {
    req.log.error({ error }, 'Error in signals debug endpoint')
    await req.responseHandler.error(req, res, error)
  }
}
