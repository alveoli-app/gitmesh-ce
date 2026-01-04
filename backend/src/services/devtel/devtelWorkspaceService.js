"use strict";
/**
 * DevTel Service - Core service for DevTel workspace management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@gitmesh/common");
const logging_1 = require("@gitmesh/logging");
const sequelizeRepository_1 = __importDefault(require("../../database/repositories/sequelizeRepository"));
class DevtelWorkspaceService extends logging_1.LoggerBase {
    constructor(options) {
        super(options.log);
        this.options = options;
    }
    /**
     * Get or create the DevTel workspace for the current tenant
     * Workspaces are 1:1 with tenants
     */
    async getOrCreate() {
        var _a;
        const transaction = await sequelizeRepository_1.default.createTransaction(this.options);
        try {
            const tenantId = this.options.currentTenant.id;
            // Check if workspace exists
            let workspace = await this.options.database.devtelWorkspaces.findOne({
                where: {
                    tenantId,
                    deletedAt: null,
                },
                transaction,
            });
            if (!workspace) {
                // Create default workspace
                workspace = await this.options.database.devtelWorkspaces.create({
                    tenantId,
                    name: this.options.currentTenant.name || 'Default Workspace',
                    settings: {},
                    createdById: (_a = this.options.currentUser) === null || _a === void 0 ? void 0 : _a.id,
                }, { transaction });
                // Create default workspace settings
                await this.options.database.devtelWorkspaceSettings.create({
                    workspaceId: workspace.id,
                    defaultCycleLength: 14,
                    workingHoursPerDay: 8.0,
                    issueTypes: ['story', 'bug', 'task', 'epic'],
                    priorities: ['urgent', 'high', 'medium', 'low'],
                    statuses: ['backlog', 'todo', 'in_progress', 'review', 'done'],
                    customFields: [],
                }, { transaction });
                // Create default agent settings
                await this.options.database.devtelAgentSettings.create({
                    workspaceId: workspace.id,
                    enabledAgents: ['prioritize', 'breakdown', 'suggest-assignee'],
                    temperature: 0.7,
                    approvalRequired: true,
                    customPrompts: {},
                }, { transaction });
            }
            await sequelizeRepository_1.default.commitTransaction(transaction);
            return this.findById(workspace.id);
        }
        catch (error) {
            await sequelizeRepository_1.default.rollbackTransaction(transaction);
            throw error;
        }
    }
    /**
     * Find workspace by ID with settings
     */
    async findById(id) {
        const workspace = await this.options.database.devtelWorkspaces.findOne({
            where: {
                id,
                tenantId: this.options.currentTenant.id,
                deletedAt: null,
            },
            include: [
                {
                    model: this.options.database.devtelWorkspaceSettings,
                    as: 'workspaceSettings',
                },
                {
                    model: this.options.database.devtelAgentSettings,
                    as: 'agentSettings',
                },
            ],
        });
        if (!workspace) {
            throw new common_1.Error400(this.options.language, 'devtel.workspace.notFound');
        }
        return workspace;
    }
    /**
     * Update workspace
     */
    async update(id, data) {
        var _a;
        const transaction = await sequelizeRepository_1.default.createTransaction(this.options);
        try {
            const workspace = await this.options.database.devtelWorkspaces.findOne({
                where: {
                    id,
                    tenantId: this.options.currentTenant.id,
                    deletedAt: null,
                },
                transaction,
            });
            if (!workspace) {
                throw new common_1.Error400(this.options.language, 'devtel.workspace.notFound');
            }
            // Update workspace
            if (data.name !== undefined) {
                workspace.name = data.name;
            }
            if (data.settings !== undefined) {
                workspace.settings = Object.assign(Object.assign({}, workspace.settings), data.settings);
            }
            workspace.updatedById = (_a = this.options.currentUser) === null || _a === void 0 ? void 0 : _a.id;
            await workspace.save({ transaction });
            // Update workspace settings if provided
            if (data.workspaceSettings) {
                await this.options.database.devtelWorkspaceSettings.update(data.workspaceSettings, {
                    where: { workspaceId: id },
                    transaction,
                });
            }
            // Update agent settings if provided
            if (data.agentSettings) {
                await this.options.database.devtelAgentSettings.update(data.agentSettings, {
                    where: { workspaceId: id },
                    transaction,
                });
            }
            await sequelizeRepository_1.default.commitTransaction(transaction);
            return this.findById(id);
        }
        catch (error) {
            await sequelizeRepository_1.default.rollbackTransaction(transaction);
            throw error;
        }
    }
    /**
     * Get workspace for current tenant
     */
    async getForCurrentTenant() {
        const workspace = await this.options.database.devtelWorkspaces.findOne({
            where: {
                tenantId: this.options.currentTenant.id,
                deletedAt: null,
            },
            include: [
                {
                    model: this.options.database.devtelWorkspaceSettings,
                    as: 'workspaceSettings',
                },
                {
                    model: this.options.database.devtelAgentSettings,
                    as: 'agentSettings',
                },
            ],
        });
        if (!workspace) {
            // Auto-create if not exists
            return this.getOrCreate();
        }
        return workspace;
    }
}
exports.default = DevtelWorkspaceService;
//# sourceMappingURL=devtelWorkspaceService.js.map