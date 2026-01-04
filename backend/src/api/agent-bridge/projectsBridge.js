"use strict";
/**
 * Projects Bridge
 * Exposes project data for agents
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectSummary = void 0;
const devtelProjectService_1 = __importDefault(require("../../services/devtel/devtelProjectService"));
const getProjectSummary = async (req, res) => {
    const { projectId } = req.body;
    if (!projectId) {
        return res.status(400).json({ error: 'Missing projectId' });
    }
    try {
        const projectService = new devtelProjectService_1.default(req);
        const project = await projectService.findById(projectId);
        // Format for agent consumption
        const summary = {
            id: project.id,
            name: project.name,
            description: project.description,
            status: 'Active', // Derived or static
            stats: project.issueStats,
            leadId: project.leadUserId,
            createdAt: project.createdAt,
        };
        // Log tool call
        await req.database.agentToolLogs.create({
            tenantId: req.currentUser.tenantId,
            agentName: 'system',
            toolName: 'get_project_summary',
            parameters: { projectId },
            success: true,
            durationMs: 0,
        });
        res.json({ data: summary });
    }
    catch (error) {
        req.log.error('Failed to get project summary:', error);
        res.status(500).json({ error: 'Failed to get project summary' });
    }
};
exports.getProjectSummary = getProjectSummary;
//# sourceMappingURL=projectsBridge.js.map