/**
 * GitHub Sync Service for Dominant One-Way Sync
 * Fetches issues from GitHub and creates/updates them in GitMesh
 */

import { request } from '@octokit/request'
import DevtelIssueService from './devtelIssueService'
import DevtelWorkspaceService from './devtelWorkspaceService'
import IntegrationService from '../integrationService'

export class GithubSyncService {
    private database: any
    private log: any
    private currentTenant: any
    private currentUser: any
    private options: any

    constructor(options: any) {
        this.database = options.database
        this.log = options.log || console
        this.currentTenant = options.currentTenant
        this.currentUser = options.currentUser
        this.options = options
    }

    /**
     * Sync all issues from GitHub to GitMesh for a project
     */
    async syncProject(projectId: string) {
        console.log(`[GithubSyncService] Starting full project sync for: ${projectId}`);
        
        try {
            const project = await this.database.devtelProjects.findByPk(projectId);
            if (!project) {
                console.error(`[GithubSyncService] Project not found: ${projectId}`);
                throw new Error('Project not found');
            }

            console.log(`[GithubSyncService] Project found:`, project.name);
            console.log(`[GithubSyncService] GitHub Repo:`, project.settings?.githubRepo);
            console.log(`[GithubSyncService] Sync Settings:`, JSON.stringify(project.settings?.githubSync, null, 2));

            if (!project.settings?.githubRepo) {
                console.warn(`[GithubSyncService] No GitHub repo configured for project: ${projectId}`);
                throw new Error('No GitHub repo configured');
            }

            // Get workspace for this project using the workspace service to ensure proper tenant filtering
            const workspaceService = new DevtelWorkspaceService(this.options);
            const workspace = await workspaceService.getForCurrentTenant();
            
            if (!workspace) {
                console.error(`[GithubSyncService] Workspace not found for tenant: ${this.currentTenant.id}`);
                throw new Error('Workspace not found');
            }

            // Verify the project belongs to this workspace
            if (project.workspaceId !== workspace.id) {
                console.error(`[GithubSyncService] Project workspace mismatch. Project workspace: ${project.workspaceId}, Current workspace: ${workspace.id}`);
                throw new Error('Project does not belong to current workspace');
            }

            console.log(`[GithubSyncService] Workspace ID: ${workspace.id}`);

            // Find integration - first check devtelIntegrations, then fall back to main integrations table
            let integration = await this.database.devtelIntegrations.findOne({
                where: {
                    workspaceId: workspace.id,
                    provider: 'github'
                }
            });

            if (!integration) {
                console.log(`[GithubSyncService] No DevTel integration found, checking main integrations table...`);
                // Fall back to main integrations table (tenant-level GitHub integration)
                const mainIntegration = await this.database.integration.findOne({
                    where: {
                        tenantId: this.currentTenant.id,
                        platform: 'github'
                    }
                });

                if (!mainIntegration) {
                    console.error(`[GithubSyncService] No GitHub integration found for tenant: ${this.currentTenant.id}`);
                    throw new Error('No GitHub integration found. Please connect GitHub in the Integrations page first.');
                }

                console.log(`[GithubSyncService] Found main integration, using tenant-level GitHub integration`);
                // Adapt main integration to devtel integration structure
                integration = {
                    id: mainIntegration.id,
                    credentials: {
                        accessToken: mainIntegration.token,
                        token: mainIntegration.token
                    },
                    settings: mainIntegration.settings,
                    status: mainIntegration.status,
                    integrationIdentifier: mainIntegration.integrationIdentifier
                };
            }

            console.log(`[GithubSyncService] Integration found:`, integration.id);

            const [owner, repo] = project.settings.githubRepo.split('/');
            if (!owner || !repo) {
                console.error(`[GithubSyncService] Invalid repo format: ${project.settings.githubRepo}`);
                throw new Error('Invalid repo format');
            }

            console.log(`[GithubSyncService] Owner: ${owner}, Repo: ${repo}`);
            let token = integration.credentials?.accessToken || integration.credentials?.token;
            
            // If token is 'github-app' or missing, we need to get installation token
            if (!token || token === 'github-app') {
                console.log(`[GithubSyncService] Token is placeholder or missing, fetching installation token...`);
                
                // Get installation ID from main integration if we're using fallback
                const installId = integration.integrationIdentifier || (await this.database.integration.findOne({
                    where: {
                        tenantId: this.currentTenant.id,
                        platform: 'github'
                    }
                }))?.integrationIdentifier;
                
                if (!installId) {
                    console.error(`[GithubSyncService] No installation ID found`);
                    throw new Error('No GitHub App installation ID found');
                }
                
                console.log(`[GithubSyncService] Using installation ID: ${installId}`);
                token = await IntegrationService.getInstallToken(installId);
            }
            
            if (!token) {
                console.error(`[GithubSyncService] No access token found in integration`);
                throw new Error('No access token found');
            }

            console.log(`[GithubSyncService] Token found (length: ${token.length}), initializing Octokit...`);

            const octokit = request.defaults({
                headers: {
                    authorization: `token ${token}`,
                },
            });

            // Fetch all issues from GitHub
            console.log(`[GithubSyncService] Fetching issues from GitHub...`);
            const { data: githubIssues } = await octokit('GET /repos/{owner}/{repo}/issues', {
                owner,
                repo,
                state: 'all',
                per_page: 100
            });

            console.log(`[GithubSyncService] Fetched ${githubIssues.length} issues from GitHub`);

            // Sync each issue to GitMesh
            const issueService = new DevtelIssueService({
                database: this.database,
                log: this.log,
                currentTenant: this.currentTenant,
                currentUser: this.currentUser,
                language: 'en'
            });

            let syncedCount = 0;
            let createdCount = 0;
            let updatedCount = 0;

            for (const ghIssue of githubIssues) {
                try {
                    console.log(`[GithubSyncService] Processing GitHub issue #${ghIssue.number}: ${ghIssue.title}`);

                    // Check if issue already exists
                    const existingLink = await this.database.devtelExternalLinks.findOne({
                        where: {
                            externalType: 'github_issue',
                            externalId: ghIssue.id.toString(),
                            linkableType: 'issue'
                        }
                    });

                    if (existingLink) {
                        console.log(`[GithubSyncService] Issue already linked, updating: ${existingLink.linkableId}`);
                        
                        // Update existing issue
                        await issueService.update(projectId, existingLink.linkableId, {
                            title: ghIssue.title,
                            description: ghIssue.body || '',
                            status: ghIssue.state === 'closed' ? 'done' : 'backlog',
                            metadata: {
                                githubNumber: ghIssue.number,
                                githubUrl: ghIssue.html_url,
                                lastSyncedFrom: 'github',
                                lastSyncedAt: new Date().toISOString()
                            }
                        });

                        // Update lastSyncedAt on the link
                        await this.database.devtelExternalLinks.update(
                            { lastSyncedAt: new Date() },
                            { where: { id: existingLink.id } }
                        );

                        updatedCount++;
                    } else {
                        console.log(`[GithubSyncService] Creating new issue from GitHub #${ghIssue.number}`);
                        
                        // Create new issue
                        const newIssue = await issueService.create(projectId, {
                            title: ghIssue.title,
                            description: ghIssue.body || '',
                            status: ghIssue.state === 'closed' ? 'done' : 'backlog',
                            priority: 'medium',
                            metadata: {
                                githubNumber: ghIssue.number,
                                githubUrl: ghIssue.html_url,
                                syncedFrom: 'github'
                            }
                        });

                        console.log(`[GithubSyncService] Created issue with ID: ${newIssue.id}`);

                        // Create external link
                        await this.database.devtelExternalLinks.create({
                            linkableType: 'issue',
                            linkableId: newIssue.id,
                            externalType: 'github_issue',
                            externalId: ghIssue.id.toString(),
                            url: ghIssue.html_url,
                            metadata: {
                                number: ghIssue.number,
                                repo: `${owner}/${repo}`,
                                action: 'synced_from_github'
                            },
                            lastSyncedAt: new Date()
                        });

                        createdCount++;
                    }

                    syncedCount++;
                } catch (issueError) {
                    console.error(`[GithubSyncService] Failed to sync issue #${ghIssue.number}:`, issueError.message);
                    console.error(`[GithubSyncService] Issue error stack:`, issueError.stack);
                }
            }

            console.log(`[GithubSyncService] Sync completed: ${syncedCount} processed, ${createdCount} created, ${updatedCount} updated`);
            
            return {
                success: true,
                syncedCount,
                createdCount,
                updatedCount
            };

        } catch (error) {
            console.error(`[GithubSyncService] FATAL sync error:`, error.message);
            console.error(`[GithubSyncService] Error stack:`, error.stack);
            throw error;
        }
    }
}
