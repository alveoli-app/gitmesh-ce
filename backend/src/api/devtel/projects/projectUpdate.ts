import Permissions from '../../../security/permissions'
import PermissionChecker from '../../../services/user/permissionChecker'
import DevtelProjectService from '../../../services/devtel/devtelProjectService'

/**
 * PUT /tenant/{tenantId}/devtel/projects/:projectId
 * @summary Update a project
 * @tag DevTel Projects
 * @security Bearer
 */
export default async (req, res) => {
    new PermissionChecker(req).validateHas(Permissions.values.memberEdit)

    const projectId = req.params.projectId;
    const updateData = req.body.data || req.body;
    
    console.log('[ProjectUpdate] Updating project:', projectId);
    console.log('[ProjectUpdate] Update data:', JSON.stringify(updateData, null, 2));
    console.log('[ProjectUpdate] GitHub Sync Settings:', JSON.stringify(updateData.settings?.githubSync, null, 2));

    const service = new DevtelProjectService(req)
    const project = await service.update(projectId, updateData)
    
    console.log('[ProjectUpdate] Project updated successfully:', project.id);
    console.log('[ProjectUpdate] Updated settings:', JSON.stringify(project.settings, null, 2));

    await req.responseHandler.success(req, res, project)
}
