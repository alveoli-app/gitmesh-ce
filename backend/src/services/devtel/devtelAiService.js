"use strict";
/**
 * DevTel AI Service - Orchestrates AI workflows via CrewAI
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logging_1 = require("@gitmesh/logging");
const axios_1 = __importDefault(require("axios"));
const CREWAI_URL = process.env.CREWAI_SERVICE_URL || 'http://localhost:8001';
const CREWAI_TOKEN = process.env.CREWAI_SERVICE_TOKEN || 'dev-token';
class DevtelAiService extends logging_1.LoggerBase {
    constructor(options) {
        super(options.log);
        this.options = options;
        this.client = axios_1.default.create({
            baseURL: CREWAI_URL,
            timeout: 120000,
            headers: {
                'X-Service-Token': CREWAI_TOKEN,
                'Content-Type': 'application/json',
            },
        });
    }
    /**
     * Prioritize issues using AI
     */
    async prioritizeIssues(issueIds) {
        const issues = await this.options.database.devtelIssues.findAll({
            where: { id: issueIds, deletedAt: null },
            attributes: ['id', 'title', 'priority', 'storyPoints', 'type'],
        });
        const response = await this.callWorkflow('prioritize', {
            issues: issues.map((i) => i.get({ plain: true })),
        });
        // Log the call
        await this.logToolCall('prioritize-agent', 'prioritize_issues', { issueIds }, response);
        return response;
    }
    /**
     * Suggest issues for a sprint based on capacity
     */
    async suggestSprint(data) {
        const backlog = await this.options.database.devtelIssues.findAll({
            where: {
                projectId: data.projectId,
                status: 'backlog',
                cycleId: null,
                deletedAt: null,
            },
            attributes: ['id', 'title', 'priority', 'storyPoints', 'type'],
            order: [['priority', 'ASC']],
            limit: 50,
        });
        const response = await this.callWorkflow('suggest-sprint', {
            backlog: backlog.map((i) => i.get({ plain: true })),
            targetCapacity: data.targetCapacity,
        });
        await this.logToolCall('sprint-planner', 'suggest_sprint', data, response);
        return response;
    }
    /**
     * Break down an issue into subtasks
     */
    async breakdownIssue(issueId) {
        const issue = await this.options.database.devtelIssues.findOne({
            where: { id: issueId, deletedAt: null },
        });
        if (!issue) {
            throw new Error('Issue not found');
        }
        const response = await this.callWorkflow('breakdown', {
            issue: {
                id: issue.id,
                title: issue.title,
                description: issue.description,
                type: issue.type,
                storyPoints: issue.storyPoints,
            },
        });
        await this.logToolCall('breakdown-agent', 'breakdown_issue', { issueId }, response);
        return response;
    }
    /**
     * Suggest best team member for an issue
     */
    async suggestAssignee(issueId, projectId) {
        const issue = await this.options.database.devtelIssues.findOne({
            where: { id: issueId, deletedAt: null },
        });
        if (!issue) {
            throw new Error('Issue not found');
        }
        const team = await this.options.database.devtelTeamMembers.findAll({
            where: { projectId, deletedAt: null },
            include: [
                {
                    model: this.options.database.user,
                    as: 'user',
                    attributes: ['id', 'fullName', 'email'],
                },
            ],
        });
        const response = await this.callWorkflow('suggest-assignee', {
            issue: {
                id: issue.id,
                title: issue.title,
                type: issue.type,
            },
            team: team.map((m) => {
                var _a, _b;
                return ({
                    id: (_a = m.user) === null || _a === void 0 ? void 0 : _a.id,
                    name: (_b = m.user) === null || _b === void 0 ? void 0 : _b.fullName,
                    currentWorkload: m.currentWorkload || 0,
                });
            }),
        });
        await this.logToolCall('assignee-agent', 'suggest_assignee', { issueId }, response);
        return response;
    }
    /**
     * Generate a product spec/PRD using AI
     */
    async generateSpec(data) {
        var _a;
        const response = await this.callWorkflow('generate-spec', {
            title: data.title,
            description: data.description || '',
        });
        await this.logToolCall('spec-generator', 'generate_spec', data, response);
        // Optionally save as a new spec
        if (data.projectId && response.content) {
            const spec = await this.options.database.devtelSpecs.create({
                projectId: data.projectId,
                title: data.title,
                content: response.content,
                status: 'draft',
                authorId: (_a = this.options.currentUser) === null || _a === void 0 ? void 0 : _a.id,
            });
            response.specId = spec.id;
        }
        return response;
    }
    // ============================================
    // Helper methods
    // ============================================
    async callWorkflow(workflow, input) {
        var _a, _b;
        try {
            const response = await this.client.post(`/workflows/${workflow}`, {
                workspaceId: ((_a = this.options.currentTenant) === null || _a === void 0 ? void 0 : _a.id) || 'unknown',
                userId: ((_b = this.options.currentUser) === null || _b === void 0 ? void 0 : _b.id) || 'unknown',
                input,
            });
            return response.data;
        }
        catch (error) {
            this.log.error(`AI workflow ${workflow} failed:`, error.message);
            throw new Error(`AI workflow failed: ${error.message}`);
        }
    }
    async logToolCall(agentId, toolName, args, result) {
        try {
            await this.options.database.devtelMcpToolCalls.create({
                agentId,
                toolName,
                arguments: args,
                resultSummary: JSON.stringify(result).substring(0, 500),
                status: 'completed',
                duration: 0,
                createdAt: new Date(),
            });
        }
        catch (e) {
            // Don't fail if logging fails
            this.log.warn('Failed to log AI tool call:', e);
        }
    }
}
exports.default = DevtelAiService;
//# sourceMappingURL=devtelAiService.js.map