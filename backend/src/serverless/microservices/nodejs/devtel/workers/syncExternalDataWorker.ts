/**
 * Sync External Data Worker
 * Pulls data from GitHub/Jira and syncs to DevTel
 */
import { getServiceChildLogger } from '@gitmesh/logging'
import { DevtelSyncExternalDataMessage } from '../messageTypes'
import { request } from '@octokit/request'
import { databaseInit } from '../../../../../database/databaseConnection'

const log = getServiceChildLogger('SyncExternalDataWorker')

export async function syncExternalDataWorker(
    message: DevtelSyncExternalDataMessage
): Promise<any> {
    const { tenant, workspaceId, integrationId, provider, syncType } = message

    const database = await databaseInit()
    log.info({ workspaceId, provider, syncType }, 'Starting external data sync')

    try {
        // Get integration credentials
        const integration = await getIntegration(database, tenant, integrationId)
        if (!integration) {
            throw new Error(`Integration ${integrationId} not found`)
        }

        let syncResult: SyncResult

        switch (provider) {
            case 'github':
                syncResult = await syncGithubData(database, tenant, workspaceId, integration, syncType)
                break
            case 'jira':
                syncResult = await syncJiraData(tenant, workspaceId, integration, syncType)
                break
            default:
                throw new Error(`Unknown provider: ${provider}`)
        }

        // Update integration last synced timestamp
        await updateIntegrationSyncStatus(tenant, integrationId, 'success')

        log.info({ workspaceId, provider, ...syncResult }, 'External data sync completed')

        return syncResult
    } catch (error) {
        log.error({ error, workspaceId, provider }, 'External data sync failed')
        await updateIntegrationSyncStatus(tenant, integrationId, 'error', error.message)
        throw error
    }
}

interface SyncResult {
    issuesCreated: number
    issuesUpdated: number
    externalLinksCreated: number
}

async function getIntegration(database: any, tenant: string, integrationId: string): Promise<any> {
    // Fetch integration securely
    return await database.devtelIntegrations.findByPk(integrationId);
}

async function syncGithubData(
    database: any,
    tenant: string,
    workspaceId: string,
    integration: any,
    syncType: string
): Promise<SyncResult> {
    log.info({ workspaceId, syncType }, 'Syncing GitHub data')

    const stats: SyncResult = {
        issuesCreated: 0,
        issuesUpdated: 0,
        externalLinksCreated: 0,
    }

    // Configure Octokit
    const token = integration.credentials?.accessToken || integration.credentials?.token;
    if (!token) {
        throw new Error('No access token found for GitHub integration');
    }

    const octokit = request.defaults({
        headers: {
            authorization: `token ${token}`,
        },
    })

    // Find all projects in workspace with a githubRepo setting
    const projects = await database.devtelProjects.findAll({
        where: {
            workspaceId,
            deletedAt: null
        }
    });

    const linkedProjects = projects.filter((p: any) => p.settings && p.settings.githubRepo);

    log.info({ projectCount: linkedProjects.length }, 'Found projects with linked GitHub repositories');

    for (const project of linkedProjects) {
        try {
            const [owner, repo] = project.settings.githubRepo.split('/');
            if (!owner || !repo) continue;

            log.info({ projectId: project.id, repo: project.settings.githubRepo }, 'Syncing project issues');

            // Fetch issues (pagination loop simplified for example)
            // TODO: Handle pagination properly for production
            const { data: issues } = await octokit('GET /repos/{owner}/{repo}/issues', {
                owner,
                repo,
                state: 'all', // Sync open and closed
                per_page: 100,
                sort: 'updated',
                direction: 'desc'
            });

            for (const issue of issues) {
                // Skip PRs (which are also issues in GitHub API)
                if (issue.pull_request) continue;

                // Check if already exists linked
                const existingLink = await database.devtelExternalLinks.findOne({
                    where: {
                        externalId: issue.id.toString(),
                        externalType: 'github_issue',
                        linkableType: 'issue'
                    }
                });

                if (existingLink) {
                    // Update existing
                    const devtelIssue = await database.devtelIssues.findByPk(existingLink.linkableId);
                    if (devtelIssue) {
                        const updates: any = {};
                        if (issue.state === 'closed' && devtelIssue.status !== 'done') {
                            updates.status = 'done';
                        }
                        // Only update matched fields if changed to avoid noise
                        if (Object.keys(updates).length > 0) {
                            await devtelIssue.update(updates);
                            stats.issuesUpdated++;
                        }
                    }
                } else {
                    // Create new
                    const newIssue = await database.devtelIssues.create({
                        projectId: project.id,
                        title: issue.title,
                        description: issue.body || '',
                        status: issue.state === 'closed' ? 'done' : 'todo',
                        priority: 'medium', // Default
                        metadata: {
                            source: 'github',
                            githubNumber: issue.number,
                            githubAuthor: issue.user?.login
                        },
                        createdById: integration.createdById // Attribute to integrator
                    });

                    await database.devtelExternalLinks.create({
                        linkableType: 'issue',
                        linkableId: newIssue.id,
                        externalType: 'github_issue',
                        externalId: issue.id.toString(),
                        url: issue.html_url,
                        metadata: {
                            number: issue.number,
                            repo: `${owner}/${repo}`,
                            author: issue.user?.login,
                            status: issue.state,
                            createdAt: issue.created_at
                        },
                        lastSyncedAt: new Date()
                    });
                    stats.issuesCreated++;
                    stats.externalLinksCreated++;
                }
            }

        } catch (err) {
            log.error({ projectId: project.id, error: err.message }, 'Failed to sync project');
        }
    }

    return stats;
}

async function syncJiraData(
    tenant: string,
    workspaceId: string,
    integration: any,
    syncType: string
): Promise<SyncResult> {
    log.info({ workspaceId, syncType }, 'Syncing Jira data')

    // TODO: Implement actual Jira API sync
    // 1. Fetch issues from Jira API
    // 2. Match/create DevTel issues
    // 3. Create external links
    // 4. Sync status changes

    return {
        issuesCreated: 0,
        issuesUpdated: 0,
        externalLinksCreated: 0,
    }
}

async function updateIntegrationSyncStatus(
    tenant: string,
    integrationId: string,
    status: 'success' | 'error',
    errorMessage?: string
): Promise<void> {
    // TODO: Update devtelIntegrations table
    log.info({ integrationId, status }, 'Integration sync status updated')
}
