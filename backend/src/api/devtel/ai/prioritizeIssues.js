"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const common_1 = require("@gitmesh/common");
/**
 * POST /tenant/{tenantId}/devtel/ai/prioritize-issues
 * @summary AI-powered issue prioritization
 * @tag DevTel AI
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberEdit);
    const { issueIds } = req.body;
    if (!issueIds || !Array.isArray(issueIds) || issueIds.length === 0) {
        throw new common_1.Error400(req.language, 'devtel.ai.issueIdsRequired');
    }
    // Get issues to prioritize
    const issues = await req.database.devtelIssues.findAll({
        where: {
            id: issueIds,
            deletedAt: null,
        },
        attributes: ['id', 'title', 'description', 'priority', 'status', 'storyPoints'],
    });
    // TODO: Call CrewAI service for actual prioritization
    // For now, return a mock implementation based on simple heuristics
    const prioritized = issues
        .map(issue => {
        const urgencyScore = calculateUrgencyScore(issue);
        return {
            issueId: issue.id,
            title: issue.title,
            currentPriority: issue.priority,
            suggestedPriority: determinePriority(urgencyScore),
            urgencyScore,
            reasoning: generateReasoning(issue, urgencyScore),
        };
    })
        .sort((a, b) => b.urgencyScore - a.urgencyScore);
    // Log the AI tool call
    await req.database.devtelMcpToolCalls.create({
        agentId: 'prioritization-agent',
        toolName: 'prioritize_issues',
        arguments: { issueIds },
        resultSummary: `Prioritized ${issues.length} issues`,
        status: 'completed',
        duration: 100, // Mock duration
        createdAt: new Date(),
    });
    await req.responseHandler.success(req, res, {
        prioritized,
        jobId: null, // No async job for now
    });
};
function calculateUrgencyScore(issue) {
    let score = 0;
    // Priority scoring
    switch (issue.priority) {
        case 'urgent':
            score += 80;
            break;
        case 'high':
            score += 60;
            break;
        case 'medium':
            score += 40;
            break;
        case 'low':
            score += 20;
            break;
    }
    // Story points add complexity weight
    if (issue.storyPoints) {
        score += Math.min(issue.storyPoints * 2, 20);
    }
    return score;
}
function determinePriority(score) {
    if (score >= 80)
        return 'urgent';
    if (score >= 60)
        return 'high';
    if (score >= 40)
        return 'medium';
    return 'low';
}
function generateReasoning(issue, score) {
    const reasons = [];
    if (issue.priority === 'urgent' || issue.priority === 'high') {
        reasons.push('Marked as high priority');
    }
    if (issue.storyPoints > 5) {
        reasons.push('Large story point estimate');
    }
    return reasons.length ? reasons.join('; ') : 'Standard priority based on metadata';
}
//# sourceMappingURL=prioritizeIssues.js.map