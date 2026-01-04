"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentTaskWorker = agentTaskWorker;
/**
 * Agent Task Worker
 * Executes AI agent tasks (calls CrewAI service)
 */
const logging_1 = require("@gitmesh/logging");
const log = (0, logging_1.getServiceChildLogger)('AgentTaskWorker');
// CrewAI service URL (environment variable)
const CREWAI_SERVICE_URL = process.env.CREWAI_SERVICE_URL || 'http://localhost:8000';
async function agentTaskWorker(message) {
    const { tenant, workspaceId, agentType, input, userId, callbackUrl } = message;
    log.info({ workspaceId, agentType }, 'Starting agent task');
    try {
        // Create job record
        const jobId = await createAgentJob(tenant, workspaceId, agentType, input);
        // Call CrewAI service
        const result = await executeAgentTask(agentType, {
            workspaceId,
            input,
            userId,
            jobId,
            callbackUrl,
        });
        // Update job with result
        await updateAgentJob(tenant, jobId, 'completed', result);
        log.info({ workspaceId, agentType, jobId }, 'Agent task completed');
        return { jobId, result };
    }
    catch (error) {
        log.error({ error, workspaceId, agentType }, 'Agent task failed');
        throw error;
    }
}
async function createAgentJob(tenant, workspaceId, agentType, input) {
    // TODO: Create devtelJobs record
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    log.debug({ jobId, agentType }, 'Created agent job');
    return jobId;
}
async function updateAgentJob(tenant, jobId, status, result) {
    // TODO: Update devtelJobs record
    log.debug({ jobId, status }, 'Updated agent job');
}
async function executeAgentTask(agentType, payload) {
    const endpoint = getAgentEndpoint(agentType);
    log.info({ agentType, endpoint }, 'Calling CrewAI service');
    try {
        const response = await fetch(`${CREWAI_SERVICE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Service-Token': process.env.CREWAI_SERVICE_TOKEN || '',
            },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            throw new Error(`CrewAI service error: ${response.status}`);
        }
        return await response.json();
    }
    catch (error) {
        // If CrewAI service is unavailable, fall back to mock implementation
        log.warn({ error, agentType }, 'CrewAI service unavailable, using mock');
        return executeMockAgent(agentType, payload);
    }
}
function getAgentEndpoint(agentType) {
    const endpoints = {
        'prioritize': '/workflows/prioritize',
        'suggest-sprint': '/workflows/suggest-sprint',
        'breakdown': '/workflows/breakdown',
        'assignee': '/workflows/suggest-assignee',
        'generate-spec': '/workflows/generate-spec',
    };
    return endpoints[agentType] || `/workflows/${agentType}`;
}
function executeMockAgent(agentType, payload) {
    // Mock implementations for when CrewAI is unavailable
    switch (agentType) {
        case 'prioritize':
            return { prioritized: [], reasoning: 'Mock prioritization' };
        case 'suggest-sprint':
            return { suggested: [], totalPoints: 0 };
        case 'breakdown':
            return { subtasks: [] };
        case 'assignee':
            return { suggestions: [] };
        case 'generate-spec':
            return { content: { type: 'doc', content: [] } };
        default:
            return { mock: true };
    }
}
//# sourceMappingURL=agentTaskWorker.js.map