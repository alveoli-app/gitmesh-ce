"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@gitmesh/common");
const crypto_1 = __importDefault(require("crypto"));
/**
 * POST /webhook/devtel/github/:workspaceId
 * @summary GitHub webhook handler for DevSpace
 * @tag DevSpace Webhooks
 * @public (signature validated)
 */
exports.default = async (req, res) => {
    var _a;
    const { workspaceId } = req.params;
    const signature = req.headers['x-hub-signature-256'];
    const event = req.headers['x-github-event'];
    const deliveryId = req.headers['x-github-delivery'];
    req.log.info({ workspaceId, event, deliveryId }, 'Received GitHub webhook');
    // Get workspace and integration
    const workspace = await req.database.devtelWorkspaces.findByPk(workspaceId);
    if (!workspace) {
        req.log.error({ workspaceId }, 'Workspace not found for GitHub webhook');
        throw new common_1.Error400(req.language, 'devtel.webhook.workspaceNotFound');
    }
    req.log.info({ workspaceId, tenantId: workspace.tenantId }, 'Found workspace for webhook');
    const integration = await req.database.devtelIntegrations.findOne({
        where: {
            workspaceId,
            provider: 'github',
            status: 'active',
        },
    });
    if (!integration) {
        req.log.error({ workspaceId }, 'No active GitHub integration found for workspace');
        throw new common_1.Error400(req.language, 'devtel.webhook.integrationNotFound');
    }
    req.log.info({ integrationId: integration.id, workspaceId }, 'Found active GitHub integration');
    // Validate signature
    const webhookSecret = (_a = integration.credentials) === null || _a === void 0 ? void 0 : _a.webhookSecret;
    if (webhookSecret && signature) {
        req.log.info({ workspaceId, event }, 'Validating webhook signature');
        const payload = JSON.stringify(req.body);
        const expectedSignature = `sha256=${crypto_1.default
            .createHmac('sha256', webhookSecret)
            .update(payload)
            .digest('hex')}`;
        if (signature !== expectedSignature) {
            req.log.error({ workspaceId, event, deliveryId }, 'Webhook signature validation failed');
            // Log failed attempt
            await req.database.devtelGithubWebhookLogs.create({
                workspaceId,
                event,
                deliveryId,
                payload: req.body,
                status: 'signature_failed',
                processedAt: new Date(),
            });
            throw new common_1.Error400(req.language, 'devtel.webhook.invalidSignature');
        }
        req.log.info({ workspaceId, event }, 'Webhook signature validated successfully');
    }
    else {
        req.log.warn({ workspaceId, event, hasSecret: !!webhookSecret, hasSignature: !!signature }, 'Webhook signature validation skipped');
    }
    // Log the webhook
    req.log.info({ workspaceId, event, deliveryId }, 'Creating webhook log entry');
    const webhookLog = await req.database.devtelGithubWebhookLogs.create({
        workspaceId,
        event,
        deliveryId,
        payload: req.body,
        status: 'received',
        processedAt: new Date(),
    });
    // Process based on event type
    try {
        req.log.info({ workspaceId, event, deliveryId }, 'Processing webhook event');
        switch (event) {
            case 'issues':
                await handleIssuesEvent(req, workspace, integration, req.body);
                break;
            case 'pull_request':
                await handlePullRequestEvent(req, workspace, integration, req.body);
                break;
            case 'push':
                await handlePushEvent(req, workspace, integration, req.body);
                break;
            default:
                req.log.info({ workspaceId, event }, 'Unhandled event type, skipping processing');
                break;
        }
        await webhookLog.update({ status: 'processed' });
        req.log.info({ workspaceId, event, deliveryId }, 'Webhook processed successfully');
    }
    catch (error) {
        req.log.error({ error, workspaceId, event, deliveryId }, 'Error processing webhook');
        await webhookLog.update({
            status: 'error',
            error: error.message,
        });
        throw error;
    }
    await req.responseHandler.success(req, res, { received: true });
};
async function handleIssuesEvent(req, workspace, integration, payload) {
    const { action, issue, repository } = payload;
    req.log.info({
        workspaceId: workspace.id,
        action,
        issueNumber: issue.number,
        repository: repository.full_name
    }, 'Processing GitHub issues event');
    // Create external link for tracking
    if (action === 'opened') {
        req.log.info({ issueUrl: issue.html_url, issueTitle: issue.title }, 'GitHub issue opened');
        // TODO: Create a DevTel issue linked to GitHub
        // await req.database.devtelIssues.create({
        //   workspaceId: workspace.id,
        //   title: issue.title,
        //   description: issue.body,
        //   status: 'open',
        //   priority: 'medium',
        //   source: 'github',
        // })
        // await req.database.devtelExternalLinks.create({
        //   issueId: devtelIssue.id,
        //   externalId: issue.id.toString(),
        //   externalUrl: issue.html_url,
        //   provider: 'github',
        // })
    }
    else if (action === 'closed') {
        req.log.info({ issueUrl: issue.html_url }, 'GitHub issue closed');
        // TODO: Update linked DevTel issue status
    }
    else if (action === 'reopened') {
        req.log.info({ issueUrl: issue.html_url }, 'GitHub issue reopened');
        // TODO: Update linked DevTel issue status
    }
    else {
        req.log.info({ action }, 'Unhandled issue action');
    }
}
async function handlePullRequestEvent(req, workspace, integration, payload) {
    const { action, pull_request, repository } = payload;
    req.log.info({
        workspaceId: workspace.id,
        action,
        prNumber: pull_request.number,
        repository: repository.full_name
    }, 'Processing GitHub pull request event');
    // Parse PR body and title for issue references
    const issueRefs = parseIssueReferences(pull_request.body || '', pull_request.title || '');
    if (issueRefs.length > 0) {
        req.log.info({ issueRefs, prNumber: pull_request.number }, 'Found issue references in PR');
        for (const issueKey of issueRefs) {
            // Find DevTel issue by key (assuming format: PROJ-123)
            const devtelIssue = await req.database.devtelIssues.findOne({
                include: [{
                        model: req.database.devtelProjects,
                        as: 'project',
                        where: { workspaceId: workspace.id },
                    }],
                where: req.database.sequelize.where(req.database.sequelize.fn('CONCAT', req.database.sequelize.col('project.prefix'), '-', req.database.sequelize.col('devtelIssues.sequenceNumber')), issueKey),
            });
            if (!devtelIssue) {
                req.log.warn({ issueKey }, 'DevTel issue not found for reference');
                continue;
            }
            req.log.info({ issueId: devtelIssue.id, issueKey }, 'Linking PR to DevTel issue');
            // Create or update external link
            const [link, created] = await req.database.devtelExternalLinks.findOrCreate({
                where: {
                    linkableType: 'issue',
                    linkableId: devtelIssue.id,
                    externalType: 'github_pr',
                    externalId: pull_request.number.toString()
                },
                defaults: {
                    url: pull_request.html_url,
                    metadata: {
                        status: pull_request.state,
                        merged: pull_request.merged || false,
                        author: pull_request.user.login,
                        title: pull_request.title,
                        createdAt: pull_request.created_at,
                        updatedAt: pull_request.updated_at,
                        repository: repository.full_name,
                    },
                },
            });
            if (!created) {
                await link.update({
                    metadata: {
                        status: pull_request.state,
                        merged: pull_request.merged || false,
                        author: pull_request.user.login,
                        title: pull_request.title,
                        createdAt: pull_request.created_at,
                        updatedAt: pull_request.updated_at,
                        repository: repository.full_name,
                    },
                    lastSyncedAt: new Date(),
                });
            }
            // Auto-close issue when PR is merged
            if (action === 'closed' && pull_request.merged) {
                if (['in_progress', 'review', 'todo'].includes(devtelIssue.status)) {
                    req.log.info({ issueId: devtelIssue.id, prNumber: pull_request.number }, 'Auto-closing issue due to merged PR');
                    await devtelIssue.update({ status: 'done' });
                    // Broadcast via Socket.IO
                    if (req.io) {
                        req.io.to(`workspace:${workspace.id}`).emit('issue:updated', {
                            id: devtelIssue.id,
                            status: 'done',
                            updatedAt: new Date(),
                        });
                    }
                }
            }
        }
    }
    else {
        req.log.info({ action, prNumber: pull_request.number }, 'No issue references found in PR');
    }
}
// Helper function to parse issue references from text
function parseIssueReferences(body, title) {
    const text = `${title} ${body}`;
    const refs = new Set();
    // Match patterns like: #123, PROJ-123, fixes #123, closes PROJ-123
    const patterns = [
        /#([A-Z]+-\d+)/gi, // #PROJ-123
        /([A-Z]+-\d+)/g, // PROJ-123
        /#(\d+(?=\s|$|\.|,|;))/g, // #123 (standalone number)
    ];
    patterns.forEach(pattern => {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
            refs.add(match[1]);
        }
    });
    return Array.from(refs);
}
async function handlePushEvent(req, workspace, integration, payload) {
    var _a, _b, _c;
    const { commits, ref, repository } = payload;
    req.log.info({
        workspaceId: workspace.id,
        ref,
        commitCount: (commits === null || commits === void 0 ? void 0 : commits.length) || 0,
        repository: repository.full_name
    }, 'Processing GitHub push event');
    // Track commits for velocity/activity metrics
    if (commits && commits.length > 0) {
        req.log.info({
            commitCount: commits.length,
            firstCommit: (_a = commits[0]) === null || _a === void 0 ? void 0 : _a.message,
            author: (_c = (_b = commits[0]) === null || _b === void 0 ? void 0 : _b.author) === null || _c === void 0 ? void 0 : _c.name
        }, 'Push contains commits');
        // TODO: Create activity entries for DevTel analytics
        // Track commit velocity, code changes, author activity
    }
}
//# sourceMappingURL=githubWebhook.js.map