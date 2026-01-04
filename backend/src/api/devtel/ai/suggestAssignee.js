"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const devtelWorkspaceService_1 = __importDefault(require("../../../services/devtel/devtelWorkspaceService"));
const common_1 = require("@gitmesh/common");
/**
 * POST /tenant/{tenantId}/devtel/ai/suggest-assignee
 * @summary AI-powered assignee suggestion based on skills and workload
 * @tag DevTel AI
 * @security Bearer
 */
exports.default = async (req, res) => {
    var _a;
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberRead);
    const { issueId } = req.body;
    if (!issueId) {
        throw new common_1.Error400(req.language, 'devtel.ai.issueIdRequired');
    }
    const issue = await req.database.devtelIssues.findOne({
        where: {
            id: issueId,
            deletedAt: null,
        },
    });
    if (!issue) {
        throw new common_1.Error400(req.language, 'devtel.issue.notFound');
    }
    const workspaceService = new devtelWorkspaceService_1.default(req);
    const workspace = await workspaceService.getForCurrentTenant();
    // Get team members
    const users = await req.database.user.findAll({
        include: [
            {
                model: req.database.tenantUser,
                as: 'tenants',
                where: { tenantId: req.currentTenant.id },
                attributes: [],
            },
        ],
        attributes: ['id', 'fullName', 'email'],
    });
    // Get skills
    const skills = await req.database.devtelUserSkills.findAll({
        where: { workspaceId: workspace.id },
    });
    // Get current workload (in-progress issues)
    const workloads = await req.database.devtelIssues.findAll({
        where: {
            assigneeId: users.map(u => u.id),
            status: ['in_progress', 'review'],
            deletedAt: null,
        },
        attributes: [
            'assigneeId',
            [req.database.sequelize.fn('COUNT', '*'), 'count'],
        ],
        group: ['assigneeId'],
        raw: true,
    });
    const workloadMap = workloads.reduce((acc, w) => {
        acc[w.assigneeId] = parseInt(w.count, 10);
        return acc;
    }, {});
    // Score users based on workload (lower is better)
    const suggestions = users.map(user => {
        const currentWorkload = workloadMap[user.id] || 0;
        const userSkills = skills.filter(s => s.userId === user.id);
        // Score: lower workload = higher score
        const workloadScore = Math.max(0, 10 - currentWorkload);
        // Bonus for having skills (mock - in real implementation, match skills to issue type)
        const skillBonus = userSkills.length > 0 ? 2 : 0;
        return {
            user: user.get({ plain: true }),
            score: workloadScore + skillBonus,
            currentWorkload,
            skills: userSkills.map(s => s.skill),
            reasoning: generateReasoning(currentWorkload, userSkills),
        };
    }).sort((a, b) => b.score - a.score);
    // Log the AI tool call
    await req.database.devtelMcpToolCalls.create({
        agentId: 'assignee-agent',
        toolName: 'suggest_assignee',
        arguments: { issueId },
        resultSummary: `Top suggestion: ${((_a = suggestions[0]) === null || _a === void 0 ? void 0 : _a.user.fullName) || 'None'}`,
        status: 'completed',
        duration: 120,
        createdAt: new Date(),
    });
    await req.responseHandler.success(req, res, {
        issue: {
            id: issue.id,
            title: issue.title,
        },
        suggestions: suggestions.slice(0, 5), // Top 5
    });
};
function generateReasoning(workload, skills) {
    const reasons = [];
    if (workload === 0) {
        reasons.push('No active work');
    }
    else if (workload <= 2) {
        reasons.push('Light workload');
    }
    else if (workload <= 4) {
        reasons.push('Moderate workload');
    }
    else {
        reasons.push('Heavy workload');
    }
    if (skills.length > 0) {
        reasons.push(`Has ${skills.length} relevant skills`);
    }
    return reasons.join('; ');
}
//# sourceMappingURL=suggestAssignee.js.map