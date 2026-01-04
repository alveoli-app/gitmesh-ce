import Permissions from '../../../security/permissions'
import PermissionChecker from '../../../services/user/permissionChecker'

/**
 * GET /tenant/{tenantId}/devtel/health
 * @summary DevTel health check endpoint
 * @tag DevTel Health
 * @security Bearer
 */
export default async (req, res) => {
    try {
        // Check basic authentication
        if (!req.currentUser) {
            return res.status(401).json({ error: 'Not authenticated' })
        }

        // Check tenant context
        if (!req.currentTenant) {
            return res.status(400).json({ error: 'No tenant context' })
        }

        // Check permissions
        new PermissionChecker(req).validateHas(Permissions.values.memberRead)

        // Check database models
        const modelsCheck = {
            devtelWorkspaces: !!req.database.devtelWorkspaces,
            devtelProjects: !!req.database.devtelProjects,
            devtelIssues: !!req.database.devtelIssues,
            devtelCycles: !!req.database.devtelCycles,
        }

        // Try a simple database query
        let dbTest = null
        try {
            const workspaceCount = await req.database.devtelWorkspaces.count({
                where: { tenantId: req.currentTenant.id }
            })
            dbTest = { workspaceCount, success: true }
        } catch (error) {
            dbTest = { error: error.message, success: false }
        }

        const healthStatus = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            tenant: {
                id: req.currentTenant.id,
                name: req.currentTenant.name
            },
            user: {
                id: req.currentUser.id,
                email: req.currentUser.email
            },
            models: modelsCheck,
            database: dbTest
        }

        await req.responseHandler.success(req, res, healthStatus)
    } catch (error) {
        console.error('DevTel Health Check Error:', error.message)
        
        const errorStatus = {
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message,
            tenant: req.currentTenant?.id || 'none',
            user: req.currentUser?.id || 'none'
        }

        res.status(500).json(errorStatus)
    }
}