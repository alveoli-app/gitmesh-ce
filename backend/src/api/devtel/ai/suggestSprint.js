"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const devtelWorkspaceService_1 = __importDefault(require("../../../services/devtel/devtelWorkspaceService"));
/**
 * POST /tenant/{tenantId}/devtel/ai/suggest-sprint
 * @summary AI-powered sprint suggestion
 * @tag DevTel AI
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberEdit);
    const { projectId, targetCapacity, teamSize } = req.body;
    const workspaceService = new devtelWorkspaceService_1.default(req);
    const workspace = await workspaceService.getForCurrentTenant();
    // Get backlog issues
    const backlogIssues = await req.database.devtelIssues.findAll({
        where: {
            projectId,
            cycleId: null, // Not assigned to a cycle
            status: 'backlog',
            deletedAt: null,
        },
        order: [
            ['priority', 'DESC'], // urgent -> low
            ['storyPoints', 'ASC'], // smaller first
        ],
        limit: 50,
    });
    // Simple algorithm: fill capacity with highest priority, smallest tasks first
    const capacity = targetCapacity || 40; // Default 40 points
    let usedCapacity = 0;
    const suggested = [];
    for (const issue of backlogIssues) {
        const points = issue.storyPoints || 1;
        if (usedCapacity + points <= capacity) {
            suggested.push({
                issueId: issue.id,
                title: issue.title,
                priority: issue.priority,
                storyPoints: points,
            });
            usedCapacity += points;
        }
    }
    // Log the AI tool call
    await req.database.devtelMcpToolCalls.create({
        agentId: 'sprint-planner-agent',
        toolName: 'suggest_sprint',
        arguments: { projectId, targetCapacity, teamSize },
        resultSummary: `Suggested ${suggested.length} issues for sprint (${usedCapacity} points)`,
        status: 'completed',
        duration: 150,
        createdAt: new Date(),
    });
    await req.responseHandler.success(req, res, {
        suggested,
        totalPoints: usedCapacity,
        remainingCapacity: capacity - usedCapacity,
        totalBacklogItems: backlogIssues.length,
    });
};
//# sourceMappingURL=suggestSprint.js.map