"use strict";
/**
 * DevTel Project Service - CRUD for projects
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@gitmesh/common");
const logging_1 = require("@gitmesh/logging");
const sequelizeRepository_1 = __importDefault(require("../../database/repositories/sequelizeRepository"));
const devtelWorkspaceService_1 = __importDefault(require("./devtelWorkspaceService"));
class DevtelProjectService extends logging_1.LoggerBase {
    constructor(options) {
        super(options.log);
        this.options = options;
    }
    /**
     * Create a new project
     */
    async create(data) {
        var _a;
        const transaction = await sequelizeRepository_1.default.createTransaction(this.options);
        try {
            const workspaceService = new devtelWorkspaceService_1.default(this.options);
            const workspace = await workspaceService.getOrCreate();
            const project = await this.options.database.devtelProjects.create({
                workspaceId: workspace.id,
                name: data.name,
                description: data.description,
                prefix: data.prefix,
                color: data.color,
                leadUserId: data.leadUserId,
                settings: data.settings || {},
                createdById: (_a = this.options.currentUser) === null || _a === void 0 ? void 0 : _a.id,
            }, { transaction });
            await sequelizeRepository_1.default.commitTransaction(transaction);
            return this.findById(project.id);
        }
        catch (error) {
            await sequelizeRepository_1.default.rollbackTransaction(transaction);
            throw error;
        }
    }
    /**
     * Find project by ID
     */
    async findById(id) {
        const workspaceService = new devtelWorkspaceService_1.default(this.options);
        const workspace = await workspaceService.getForCurrentTenant();
        const project = await this.options.database.devtelProjects.findOne({
            where: {
                id,
                workspaceId: workspace.id,
                deletedAt: null,
            },
            include: [
                {
                    model: this.options.database.devtelCycles,
                    as: 'cycles',
                    where: { deletedAt: null },
                    required: false,
                    order: [['startDate', 'DESC']],
                    limit: 5,
                },
            ],
        });
        if (!project) {
            throw new common_1.Error400(this.options.language, 'devtel.project.notFound');
        }
        // Get issue counts
        const issueStats = await this.options.database.devtelIssues.findAll({
            where: {
                projectId: id,
                deletedAt: null,
            },
            attributes: [
                'status',
                [this.options.database.sequelize.fn('COUNT', '*'), 'count'],
            ],
            group: ['status'],
            raw: true,
        });
        return Object.assign(Object.assign({}, project.get({ plain: true })), { issueStats: issueStats.reduce((acc, stat) => {
                acc[stat.status] = parseInt(stat.count, 10);
                return acc;
            }, {}) });
    }
    /**
     * List all projects for current workspace
     */
    async list(params = {}) {
        const workspaceService = new devtelWorkspaceService_1.default(this.options);
        const workspace = await workspaceService.getForCurrentTenant();
        const where = {
            workspaceId: workspace.id,
            deletedAt: null,
        };
        const { rows, count } = await this.options.database.devtelProjects.findAndCountAll({
            where,
            order: [['createdAt', 'DESC']],
            limit: params.limit || 50,
            offset: params.offset || 0,
        });
        // Get issue counts for each project
        const projectIds = rows.map((p) => p.id);
        const issueCounts = await this.options.database.devtelIssues.findAll({
            where: {
                projectId: projectIds,
                deletedAt: null,
            },
            attributes: [
                'projectId',
                [this.options.database.sequelize.fn('COUNT', '*'), 'count'],
            ],
            group: ['projectId'],
            raw: true,
        });
        const countMap = issueCounts.reduce((acc, item) => {
            acc[item.projectId] = parseInt(item.count, 10);
            return acc;
        }, {});
        return {
            rows: rows.map((p) => (Object.assign(Object.assign({}, p.get({ plain: true })), { issueCount: countMap[p.id] || 0 }))),
            count,
        };
    }
    /**
     * Update a project
     */
    async update(id, data) {
        var _a;
        const transaction = await sequelizeRepository_1.default.createTransaction(this.options);
        try {
            const workspaceService = new devtelWorkspaceService_1.default(this.options);
            const workspace = await workspaceService.getForCurrentTenant();
            const project = await this.options.database.devtelProjects.findOne({
                where: {
                    id,
                    workspaceId: workspace.id,
                    deletedAt: null,
                },
                transaction,
            });
            if (!project) {
                throw new common_1.Error400(this.options.language, 'devtel.project.notFound');
            }
            const updateFields = {};
            if (data.name !== undefined)
                updateFields.name = data.name;
            if (data.description !== undefined)
                updateFields.description = data.description;
            if (data.prefix !== undefined)
                updateFields.prefix = data.prefix;
            if (data.color !== undefined)
                updateFields.color = data.color;
            if (data.leadUserId !== undefined)
                updateFields.leadUserId = data.leadUserId;
            if (data.settings !== undefined) {
                updateFields.settings = Object.assign(Object.assign({}, project.settings), data.settings);
            }
            updateFields.updatedById = (_a = this.options.currentUser) === null || _a === void 0 ? void 0 : _a.id;
            await project.update(updateFields, { transaction });
            await sequelizeRepository_1.default.commitTransaction(transaction);
            return this.findById(id);
        }
        catch (error) {
            await sequelizeRepository_1.default.rollbackTransaction(transaction);
            throw error;
        }
    }
    /**
     * Delete a project (soft delete)
     */
    async destroy(id) {
        var _a;
        const transaction = await sequelizeRepository_1.default.createTransaction(this.options);
        try {
            const workspaceService = new devtelWorkspaceService_1.default(this.options);
            const workspace = await workspaceService.getForCurrentTenant();
            const project = await this.options.database.devtelProjects.findOne({
                where: {
                    id,
                    workspaceId: workspace.id,
                    deletedAt: null,
                },
                transaction,
            });
            if (!project) {
                throw new common_1.Error400(this.options.language, 'devtel.project.notFound');
            }
            await project.update({
                deletedAt: new Date(),
                updatedById: (_a = this.options.currentUser) === null || _a === void 0 ? void 0 : _a.id,
            }, { transaction });
            await sequelizeRepository_1.default.commitTransaction(transaction);
            return true;
        }
        catch (error) {
            await sequelizeRepository_1.default.rollbackTransaction(transaction);
            throw error;
        }
    }
}
exports.default = DevtelProjectService;
//# sourceMappingURL=devtelProjectService.js.map