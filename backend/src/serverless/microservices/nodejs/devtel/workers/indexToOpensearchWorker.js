"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.indexToOpensearchWorker = indexToOpensearchWorker;
/**
 * Index to OpenSearch Worker
 * Indexes DevTel entities for full-text search
 */
const logging_1 = require("@gitmesh/logging");
const log = (0, logging_1.getServiceChildLogger)('IndexToOpensearchWorker');
// OpenSearch index names
const DEVTEL_ISSUES_INDEX = 'devtel-issues';
const DEVTEL_SPECS_INDEX = 'devtel-specs';
async function indexToOpensearchWorker(message) {
    const { tenant, entityType, entityId, action } = message;
    log.info({ entityType, entityId, action }, 'Processing OpenSearch index request');
    try {
        if (action === 'delete') {
            await deleteFromIndex(entityType, entityId);
        }
        else {
            await indexEntity(tenant, entityType, entityId);
        }
        return { success: true, entityType, entityId, action };
    }
    catch (error) {
        log.error({ error, entityType, entityId }, 'OpenSearch indexing failed');
        throw error;
    }
}
async function indexEntity(tenant, entityType, entityId) {
    // TODO: Get entity from database
    const entity = await getEntity(tenant, entityType, entityId);
    if (!entity) {
        log.warn({ entityType, entityId }, 'Entity not found for indexing');
        return;
    }
    const indexName = entityType === 'issue' ? DEVTEL_ISSUES_INDEX : DEVTEL_SPECS_INDEX;
    const document = buildSearchDocument(entityType, entity);
    // TODO: Use actual OpenSearch client
    // await opensearchClient.index({
    //   index: indexName,
    //   id: entityId,
    //   body: document,
    // })
    log.info({ indexName, entityId }, 'Entity indexed to OpenSearch');
    // Update searchSyncedAt timestamp
    await updateSearchSyncedAt(tenant, entityType, entityId);
}
async function deleteFromIndex(entityType, entityId) {
    const indexName = entityType === 'issue' ? DEVTEL_ISSUES_INDEX : DEVTEL_SPECS_INDEX;
    // TODO: Use actual OpenSearch client
    // await opensearchClient.delete({
    //   index: indexName,
    //   id: entityId,
    // })
    log.info({ indexName, entityId }, 'Entity deleted from OpenSearch');
}
async function getEntity(tenant, entityType, entityId) {
    // TODO: Use SequelizeRepository
    return null;
}
function buildSearchDocument(entityType, entity) {
    if (entityType === 'issue') {
        return {
            id: entity.id,
            projectId: entity.projectId,
            title: entity.title,
            description: entity.description || '',
            status: entity.status,
            priority: entity.priority,
            labels: entity.labels || [],
            assigneeId: entity.assigneeId,
            createdAt: entity.createdAt,
            updatedAt: entity.updatedAt,
        };
    }
    else {
        return {
            id: entity.id,
            projectId: entity.projectId,
            title: entity.title,
            content: extractTextFromContent(entity.content),
            status: entity.status,
            authorId: entity.authorId,
            createdAt: entity.createdAt,
            updatedAt: entity.updatedAt,
        };
    }
}
function extractTextFromContent(content) {
    // Extract plain text from Tiptap JSON content
    if (!content)
        return '';
    if (typeof content === 'string')
        return content;
    // Recursively extract text nodes
    const texts = [];
    function extractText(node) {
        if (node.text) {
            texts.push(node.text);
        }
        if (node.content && Array.isArray(node.content)) {
            node.content.forEach(extractText);
        }
    }
    extractText(content);
    return texts.join(' ');
}
async function updateSearchSyncedAt(tenant, entityType, entityId) {
    // TODO: Update searchSyncedAt column
    log.debug({ entityType, entityId }, 'Updated searchSyncedAt');
}
//# sourceMappingURL=indexToOpensearchWorker.js.map