"use strict";
/**
 * DevTel OpenSearch Index Definitions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.devtelSpecsMapping = exports.devtelIssuesMapping = exports.DEVTEL_SPECS_INDEX = exports.DEVTEL_ISSUES_INDEX = void 0;
exports.createDevtelIndices = createDevtelIndices;
exports.deleteDevtelIndices = deleteDevtelIndices;
exports.DEVTEL_ISSUES_INDEX = 'devtel-issues';
exports.DEVTEL_SPECS_INDEX = 'devtel-specs';
/**
 * DevTel Issues Index Mapping
 * Full-text search on title, description with facets for status, priority, assignee
 */
exports.devtelIssuesMapping = {
    settings: {
        number_of_shards: 1,
        number_of_replicas: 1,
        analysis: {
            analyzer: {
                default: {
                    type: 'standard',
                },
                text_analyzer: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: ['lowercase', 'asciifolding', 'porter_stem'],
                },
            },
        },
    },
    mappings: {
        properties: {
            id: { type: 'keyword' },
            projectId: { type: 'keyword' },
            cycleId: { type: 'keyword' },
            workspaceId: { type: 'keyword' },
            issueKey: { type: 'keyword' },
            title: {
                type: 'text',
                analyzer: 'text_analyzer',
                fields: {
                    keyword: { type: 'keyword' },
                },
            },
            description: {
                type: 'text',
                analyzer: 'text_analyzer',
            },
            type: { type: 'keyword' },
            status: { type: 'keyword' },
            priority: { type: 'keyword' },
            labels: { type: 'keyword' },
            storyPoints: { type: 'integer' },
            assigneeId: { type: 'keyword' },
            assigneeName: { type: 'text' },
            reporterId: { type: 'keyword' },
            reporterName: { type: 'text' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
            dueDate: { type: 'date' },
        },
    },
};
/**
 * DevTel Specs Index Mapping
 * Full-text search on title and content with facets for status, author
 */
exports.devtelSpecsMapping = {
    settings: {
        number_of_shards: 1,
        number_of_replicas: 1,
        analysis: {
            analyzer: {
                default: {
                    type: 'standard',
                },
                text_analyzer: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: ['lowercase', 'asciifolding', 'porter_stem'],
                },
            },
        },
    },
    mappings: {
        properties: {
            id: { type: 'keyword' },
            projectId: { type: 'keyword' },
            workspaceId: { type: 'keyword' },
            title: {
                type: 'text',
                analyzer: 'text_analyzer',
                fields: {
                    keyword: { type: 'keyword' },
                },
            },
            content: {
                type: 'text',
                analyzer: 'text_analyzer',
            },
            status: { type: 'keyword' },
            authorId: { type: 'keyword' },
            authorName: { type: 'text' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
        },
    },
};
/**
 * Create or update DevTel indices in OpenSearch
 */
async function createDevtelIndices(client) {
    // Create issues index
    const issuesExists = await client.indices.exists({ index: exports.DEVTEL_ISSUES_INDEX });
    if (!issuesExists.body) {
        await client.indices.create({
            index: exports.DEVTEL_ISSUES_INDEX,
            body: exports.devtelIssuesMapping,
        });
        console.log(`Created index: ${exports.DEVTEL_ISSUES_INDEX}`);
    }
    // Create specs index
    const specsExists = await client.indices.exists({ index: exports.DEVTEL_SPECS_INDEX });
    if (!specsExists.body) {
        await client.indices.create({
            index: exports.DEVTEL_SPECS_INDEX,
            body: exports.devtelSpecsMapping,
        });
        console.log(`Created index: ${exports.DEVTEL_SPECS_INDEX}`);
    }
}
/**
 * Delete DevTel indices
 */
async function deleteDevtelIndices(client) {
    await client.indices.delete({ index: exports.DEVTEL_ISSUES_INDEX, ignore_unavailable: true });
    await client.indices.delete({ index: exports.DEVTEL_SPECS_INDEX, ignore_unavailable: true });
}
//# sourceMappingURL=devtelIndices.js.map