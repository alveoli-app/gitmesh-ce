import Permissions from '../../../security/permissions'
import PermissionChecker from '../../../services/user/permissionChecker'
import DevtelIssueService from '../../../services/devtel/devtelIssueService'
import { GithubSyncService } from '../../../services/devtel/githubSyncService'

/**
 * POST /tenant/{tenantId}/devtel/projects/:projectId/sync/trigger
 */
export default async (req, res) => {
    // Basic permission check
    new PermissionChecker(req).validateHas(Permissions.values.memberCreate) 

    const projectId = req.params.projectId
    const tenantId = req.params.tenantId
    
    console.log('='.repeat(60));
    console.log('[SyncTrigger] Manual sync triggered');
    console.log('[SyncTrigger] Project ID:', projectId);
    console.log('[SyncTrigger] Tenant ID:', tenantId);
    console.log('[SyncTrigger] User:', req.currentUser?.email);
    console.log('='.repeat(60));

    // 1. Fetch Project to get GitHub settings
    // 2. Queue full sync job
    // For now, we delegate to the issue service to trigger sync logic if possible
    
    console.log('[SyncTrigger] Starting sync process...');
    
    try {
        console.log('[SyncTrigger] Initializing GithubSyncService...');
        const syncService = new GithubSyncService({
            database: req.database,
            log: req.log || console,
            currentTenant: req.currentTenant,
            currentUser: req.currentUser,
            language: req.language || 'en'
        });
        
        console.log('[SyncTrigger] Calling syncProject method...');
        const result = await syncService.syncProject(projectId);
        console.log('[SyncTrigger] syncProject completed successfully:', result);
        
        const responseData = {
            message: 'Sync completed successfully',
            jobId: `job_${Date.now()}`,
            projectId: projectId,
            result: result
        };
        
        console.log('[SyncTrigger] Sending success response:', responseData);
        console.log('='.repeat(60));
        
        await req.responseHandler.success(req, res, responseData)
        
    } catch (error) {
        console.error('[SyncTrigger] Sync failed with error:');
        console.error('[SyncTrigger] Error message:', error.message);
        console.error('[SyncTrigger] Error stack:', error.stack);
        
        const errorResponse = {
            message: 'Sync failed: ' + error.message,
            jobId: `job_${Date.now()}`,
            projectId: projectId,
            error: error.message
        };
        
        console.log('[SyncTrigger] Sending error response:', errorResponse);
        console.log('='.repeat(60));
        
        await req.responseHandler.error(req, res, errorResponse)
    }
}
