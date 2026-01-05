import { DataTypes } from 'sequelize'

/**
 * DevTel Sequelize Models
 * Defines all DevTel-related database models
 */
export default (sequelize) => {
    // ================================================
    // DevTel Workspaces
    // ================================================
    const devtelWorkspaces = sequelize.define(
        'devtelWorkspaces',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            tenantId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            name: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
            settings: {
                type: DataTypes.JSONB,
                defaultValue: {},
            },
        },
        {
            tableName: 'devtelWorkspaces',
            timestamps: true,
            paranoid: true,
        },
    )

    // ================================================
    // DevTel Projects
    // ================================================
    const devtelProjects = sequelize.define(
        'devtelProjects',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            workspaceId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            name: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
            description: {
                type: DataTypes.TEXT,
            },
            prefix: {
                type: DataTypes.STRING(10),
            },
            color: {
                type: DataTypes.STRING(7),
            },
            leadUserId: {
                type: DataTypes.UUID,
            },
            settings: {
                type: DataTypes.JSONB,
                defaultValue: {},
            },
        },
        {
            tableName: 'devtelProjects',
            timestamps: true,
            paranoid: true,
        },
    )

    // ================================================
    // DevTel Cycles (Sprints)
    // ================================================
    const devtelCycles = sequelize.define(
        'devtelCycles',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            projectId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            name: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
            goal: {
                type: DataTypes.TEXT,
            },
            status: {
                type: DataTypes.STRING(20),
                defaultValue: 'planned',
            },
            startDate: {
                type: DataTypes.DATEONLY,
            },
            endDate: {
                type: DataTypes.DATEONLY,
            },
            velocity: {
                type: DataTypes.INTEGER,
            },
            storyPointsCompleted: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
            },
        },
        {
            tableName: 'devtelCycles',
            timestamps: true,
            paranoid: true,
        },
    )

    // ================================================
    // DevTel Issues
    // ================================================
    const devtelIssues = sequelize.define(
        'devtelIssues',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            projectId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            cycleId: {
                type: DataTypes.UUID,
            },
            parentIssueId: {
                type: DataTypes.UUID,
            },
            assigneeId: {
                type: DataTypes.UUID,
            },
            assigneeMemberId: {
                type: DataTypes.UUID,
                comment: 'References a member from contacts. Used for team members who may not have logged in yet.',
            },
            title: {
                type: DataTypes.STRING(500),
                allowNull: false,
            },
            description: {
                type: DataTypes.TEXT,
            },
            status: {
                type: DataTypes.STRING(50),
                defaultValue: 'backlog',
            },
            priority: {
                type: DataTypes.STRING(50),
                defaultValue: 'medium',
            },
            estimatedHours: {
                type: DataTypes.DECIMAL(10, 2),
            },
            actualHours: {
                type: DataTypes.DECIMAL(10, 2),
            },
            complexityScore: {
                type: DataTypes.INTEGER,
            },
            storyPoints: {
                type: DataTypes.INTEGER,
            },
            metadata: {
                type: DataTypes.JSONB,
                defaultValue: {},
            },
            searchSyncedAt: {
                type: DataTypes.DATE,
            },
            createdById: {
                type: DataTypes.UUID,
            },
            updatedById: {
                type: DataTypes.UUID,
            },
        },
        {
            tableName: 'devtelIssues',
            timestamps: true,
            paranoid: true,
        },
    )

    // ================================================
    // DevTel Issue Assignments
    // ================================================
    const devtelIssueAssignments = sequelize.define(
        'devtelIssueAssignments',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            issueId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            userId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            allocatedHours: {
                type: DataTypes.DECIMAL(5, 2),
            },
            scheduledDate: {
                type: DataTypes.DATEONLY,
            },
        },
        {
            tableName: 'devtelIssueAssignments',
            timestamps: true,
        },
    )

    // ================================================
    // DevTel Issue Comments
    // ================================================
    const devtelIssueComments = sequelize.define(
        'devtelIssueComments',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            issueId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            authorId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            content: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
        },
        {
            tableName: 'devtelIssueComments',
            timestamps: true,
        },
    )

    // ================================================
    // DevTel Spec Documents
    // ================================================
    const devtelSpecDocuments = sequelize.define(
        'devtelSpecDocuments',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            tenantId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            projectId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            authorId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            title: {
                type: DataTypes.STRING(500),
                allowNull: false,
            },
            content: {
                type: DataTypes.JSONB,
                defaultValue: {},
            },
            status: {
                type: DataTypes.STRING(20),
                defaultValue: 'draft',
            },
            createdById: {
                type: DataTypes.UUID,
            },
            updatedById: {
                type: DataTypes.UUID,
            },
        },
        {
            tableName: 'devtelSpecDocuments',
            timestamps: true,
            paranoid: true,
        },
    )

    // ================================================
    // DevTel Spec Versions
    // ================================================
    const devtelSpecVersions = sequelize.define(
        'devtelSpecVersions',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            specId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            authorId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            content: {
                type: DataTypes.JSONB,
                allowNull: false,
            },
        },
        {
            tableName: 'devtelSpecVersions',
            timestamps: true,
        },
    )

    // ================================================
    // DevTel Spec Comments
    // ================================================
    const devtelSpecComments = sequelize.define(
        'devtelSpecComments',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            specId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            authorId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            content: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            textReference: {
                type: DataTypes.TEXT,
            },
            resolved: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
            },
        },
        {
            tableName: 'devtelSpecComments',
            timestamps: true,
        },
    )

    // ================================================
    // DevTel External Links
    // ================================================
    const devtelExternalLinks = sequelize.define(
        'devtelExternalLinks',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            linkableType: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            linkableId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            externalType: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            externalId: {
                type: DataTypes.STRING(255),
            },
            url: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            metadata: {
                type: DataTypes.JSONB,
                defaultValue: {},
            },
            lastSyncedAt: {
                type: DataTypes.DATE,
            },
        },
        {
            tableName: 'devtelExternalLinks',
            timestamps: true,
        },
    )

    // ================================================
    // DevTel Jobs (Temporal Workflow Tracking)
    // ================================================
    const devtelJobs = sequelize.define(
        'devtelJobs',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            workflowId: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
            workflowType: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            status: {
                type: DataTypes.STRING(20),
                defaultValue: 'pending',
            },
            input: {
                type: DataTypes.JSONB,
                defaultValue: {},
            },
            output: {
                type: DataTypes.JSONB,
            },
            error: {
                type: DataTypes.TEXT,
            },
            startedAt: {
                type: DataTypes.DATE,
            },
            completedAt: {
                type: DataTypes.DATE,
            },
        },
        {
            tableName: 'devtelJobs',
            timestamps: true,
        },
    )

    // ================================================
    // DevTel MCP Tool Calls (AI Agent Audit Log)
    // ================================================
    const devtelMcpToolCalls = sequelize.define(
        'devtelMcpToolCalls',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            agentId: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            toolName: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            arguments: {
                type: DataTypes.JSONB,
                defaultValue: {},
            },
            resultSummary: {
                type: DataTypes.TEXT,
            },
            status: {
                type: DataTypes.STRING(20),
                defaultValue: 'pending',
            },
            duration: {
                type: DataTypes.INTEGER,
            },
        },
        {
            tableName: 'devtelMcpToolCalls',
            timestamps: true,
        },
    )

    // ================================================
    // DevTel User Skills
    // ================================================
    const devtelUserSkills = sequelize.define(
        'devtelUserSkills',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            userId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            workspaceId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            skill: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            level: {
                type: DataTypes.STRING(20),
                defaultValue: 'intermediate',
            },
        },
        {
            tableName: 'devtelUserSkills',
            timestamps: true,
            createdAt: 'createdAt',
            updatedAt: false,
        },
    )

    // ================================================
    // DevTel Cycle Snapshots (Burndown)
    // ================================================
    const devtelCycleSnapshots = sequelize.define(
        'devtelCycleSnapshots',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            cycleId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            snapshotDate: {
                type: DataTypes.DATEONLY,
                allowNull: false,
            },
            totalPoints: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
            },
            remainingPoints: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
            },
            completedPoints: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
            },
            issueCount: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
            },
        },
        {
            tableName: 'devtelCycleSnapshots',
            timestamps: true,
        },
    )

    // ================================================
    // DevTel User Saved Filters
    // ================================================
    const devtelUserSavedFilters = sequelize.define(
        'devtelUserSavedFilters',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            userId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            workspaceId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            name: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            filterType: {
                type: DataTypes.STRING(50),
                defaultValue: 'issues',
            },
            config: {
                type: DataTypes.JSONB,
                defaultValue: {},
            },
        },
        {
            tableName: 'devtelUserSavedFilters',
            timestamps: true,
        },
    )

    // ================================================
    // DevTel Workspace Settings
    // ================================================
    const devtelWorkspaceSettings = sequelize.define(
        'devtelWorkspaceSettings',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            workspaceId: {
                type: DataTypes.UUID,
                allowNull: false,
                unique: true,
            },
            defaultCycleLength: {
                type: DataTypes.INTEGER,
                defaultValue: 14,
            },
            workingHoursPerDay: {
                type: DataTypes.DECIMAL(4, 2),
                defaultValue: 8.0,
            },
            issueTypes: {
                type: DataTypes.JSONB,
                defaultValue: ['story', 'bug', 'task', 'epic'],
            },
            priorities: {
                type: DataTypes.JSONB,
                defaultValue: ['urgent', 'high', 'medium', 'low'],
            },
            statuses: {
                type: DataTypes.JSONB,
                defaultValue: ['backlog', 'todo', 'in_progress', 'review', 'done'],
            },
            customFields: {
                type: DataTypes.JSONB,
                defaultValue: [],
            },
        },
        {
            tableName: 'devtelWorkspaceSettings',
            timestamps: true,
        },
    )

    // ================================================
    // DevTel Integrations
    // ================================================
    const devtelIntegrations = sequelize.define(
        'devtelIntegrations',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            workspaceId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            provider: {
                type: DataTypes.STRING(50),
                allowNull: false,
            },
            credentials: {
                type: DataTypes.JSONB,
                defaultValue: {},
            },
            settings: {
                type: DataTypes.JSONB,
                defaultValue: {},
            },
            status: {
                type: DataTypes.STRING(20),
                defaultValue: 'pending',
            },
            lastSyncedAt: {
                type: DataTypes.DATE,
            },
        },
        {
            tableName: 'devtelIntegrations',
            timestamps: true,
        },
    )

    // ================================================
    // DevTel Webhooks
    // ================================================
    const devtelWebhooks = sequelize.define(
        'devtelWebhooks',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            workspaceId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            url: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            secret: {
                type: DataTypes.STRING(255),
            },
            events: {
                type: DataTypes.ARRAY(DataTypes.STRING),
                defaultValue: [],
            },
            enabled: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
            },
            deliveryStats: {
                type: DataTypes.JSONB,
                defaultValue: {},
            },
        },
        {
            tableName: 'devtelWebhooks',
            timestamps: true,
        },
    )

    // ================================================
    // DevTel Agent Settings
    // ================================================
    const devtelAgentSettings = sequelize.define(
        'devtelAgentSettings',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            workspaceId: {
                type: DataTypes.UUID,
                allowNull: false,
                unique: true,
            },
            enabledAgents: {
                type: DataTypes.ARRAY(DataTypes.STRING),
                defaultValue: ['prioritization', 'sprint-planner', 'breakdown', 'assignee'],
            },
            temperature: {
                type: DataTypes.DECIMAL(3, 2),
                defaultValue: 0.7,
            },
            approvalRequired: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
            },
            customPrompts: {
                type: DataTypes.JSONB,
                defaultValue: {},
            },
        },
        {
            tableName: 'devtelAgentSettings',
            timestamps: true,
        },
    )

    // ================================================
    // DevTel GitHub Webhook Logs
    // ================================================
    const devtelGithubWebhookLogs = sequelize.define(
        'devtelGithubWebhookLogs',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            workspaceId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            event: {
                type: DataTypes.STRING(100),
            },
            deliveryId: {
                type: DataTypes.STRING(100),
            },
            payload: {
                type: DataTypes.JSONB,
                defaultValue: {},
            },
            status: {
                type: DataTypes.STRING(30),
                defaultValue: 'received',
            },
            error: {
                type: DataTypes.TEXT,
            },
            processedAt: {
                type: DataTypes.DATE,
            },
        },
        {
            tableName: 'devtelGithubWebhookLogs',
            timestamps: true,
        },
    )

    // ================================================
    // DevTel GitHub Commits
    // ================================================
    const devtelGithubCommits = sequelize.define(
        'devtelGithubCommits',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            workspaceId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            repoName: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
            commitSha: {
                type: DataTypes.STRING(40),
                allowNull: false,
                unique: true,
            },
            authorEmail: {
                type: DataTypes.STRING(255),
            },
            authorName: {
                type: DataTypes.STRING(255),
            },
            authorGithubUsername: {
                type: DataTypes.STRING(255),
            },
            committedDate: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            message: {
                type: DataTypes.TEXT,
            },
            additions: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
            },
            deletions: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
            },
        },
        {
            tableName: 'devtelGithubCommits',
            timestamps: true,
        },
    )

    // ================================================
    // Define Associations
    // ================================================
    devtelWorkspaces.associate = (models) => {
        devtelWorkspaces.belongsTo(models.tenant, {
            as: 'tenant',
            foreignKey: 'tenantId',
        })
        devtelWorkspaces.hasMany(models.devtelProjects, {
            as: 'projects',
            foreignKey: 'workspaceId',
        })
        devtelWorkspaces.hasOne(models.devtelWorkspaceSettings, {
            as: 'workspaceSettings',
            foreignKey: 'workspaceId',
        })
        devtelWorkspaces.hasOne(models.devtelAgentSettings, {
            as: 'agentSettings',
            foreignKey: 'workspaceId',
        })
    }

    devtelProjects.associate = (models) => {
        devtelProjects.belongsTo(models.devtelWorkspaces, {
            as: 'workspace',
            foreignKey: 'workspaceId',
        })
        devtelProjects.belongsTo(models.user, {
            as: 'lead',
            foreignKey: 'leadUserId',
        })
        devtelProjects.hasMany(models.devtelCycles, {
            as: 'cycles',
            foreignKey: 'projectId',
        })
        devtelProjects.hasMany(models.devtelIssues, {
            as: 'issues',
            foreignKey: 'projectId',
        })
    }

    devtelCycles.associate = (models) => {
        devtelCycles.belongsTo(models.devtelProjects, {
            as: 'project',
            foreignKey: 'projectId',
        })
        devtelCycles.hasMany(models.devtelIssues, {
            as: 'issues',
            foreignKey: 'cycleId',
        })
    }

    devtelIssues.associate = (models) => {
        devtelIssues.belongsTo(models.devtelProjects, {
            as: 'project',
            foreignKey: 'projectId',
        })
        devtelIssues.belongsTo(models.devtelCycles, {
            as: 'cycle',
            foreignKey: 'cycleId',
        })
        devtelIssues.belongsTo(models.devtelIssues, {
            as: 'parentIssue',
            foreignKey: 'parentIssueId',
        })
        devtelIssues.hasMany(models.devtelIssues, {
            as: 'childIssues',
            foreignKey: 'parentIssueId',
        })
        devtelIssues.belongsTo(models.user, {
            as: 'assignee',
            foreignKey: 'assigneeId',
        })
        devtelIssues.belongsTo(models.member, {
            as: 'assigneeMember',
            foreignKey: 'assigneeMemberId',
        })
        devtelIssues.hasMany(models.devtelIssueComments, {
            as: 'comments',
            foreignKey: 'issueId',
        })
        devtelIssues.hasMany(models.devtelIssueAssignments, {
            as: 'assignments',
            foreignKey: 'issueId',
        })
        devtelIssues.hasMany(models.devtelExternalLinks, {
            as: 'externalLinks',
            foreignKey: 'linkableId',
            constraints: false,
            scope: {
                linkableType: 'issue'
            }
        })
    }

    devtelIssueAssignments.associate = (models) => {
        devtelIssueAssignments.belongsTo(models.devtelIssues, {
            as: 'issue',
            foreignKey: 'issueId',
        })
        devtelIssueAssignments.belongsTo(models.user, {
            as: 'user',
            foreignKey: 'userId',
        })
    }

    devtelIssueComments.associate = (models) => {
        devtelIssueComments.belongsTo(models.devtelIssues, {
            as: 'issue',
            foreignKey: 'issueId',
        })
        devtelIssueComments.belongsTo(models.user, {
            as: 'author',
            foreignKey: 'authorId',
        })
    }

    devtelSpecDocuments.associate = (models) => {
        devtelSpecDocuments.belongsTo(models.devtelProjects, {
            as: 'project',
            foreignKey: 'projectId',
        })
        devtelSpecDocuments.belongsTo(models.user, {
            as: 'author',
            foreignKey: 'authorId',
        })
        devtelSpecDocuments.hasMany(models.devtelSpecVersions, {
            as: 'versions',
            foreignKey: 'specId',
        })
        devtelSpecDocuments.hasMany(models.devtelSpecComments, {
            as: 'comments',
            foreignKey: 'specId',
        })
    }

    devtelSpecVersions.associate = (models) => {
        devtelSpecVersions.belongsTo(models.devtelSpecDocuments, {
            as: 'spec',
            foreignKey: 'specId',
        })
        devtelSpecVersions.belongsTo(models.user, {
            as: 'author',
            foreignKey: 'authorId',
        })
    }

    devtelSpecComments.associate = (models) => {
        devtelSpecComments.belongsTo(models.devtelSpecDocuments, {
            as: 'spec',
            foreignKey: 'specId',
        })
        devtelSpecComments.belongsTo(models.user, {
            as: 'author',
            foreignKey: 'authorId',
        })
    }

    devtelUserSkills.associate = (models) => {
        devtelUserSkills.belongsTo(models.user, {
            as: 'user',
            foreignKey: 'userId',
        })
        devtelUserSkills.belongsTo(models.devtelWorkspaces, {
            as: 'workspace',
            foreignKey: 'workspaceId',
        })
    }

    return {
        devtelWorkspaces,
        devtelProjects,
        devtelCycles,
        devtelIssues,
        devtelIssueAssignments,
        devtelIssueComments,
        devtelSpecDocuments,
        devtelSpecVersions,
        devtelSpecComments,
        devtelExternalLinks,
        devtelJobs,
        devtelMcpToolCalls,
        devtelUserSkills,
        devtelCycleSnapshots,
        devtelUserSavedFilters,
        devtelWorkspaceSettings,
        devtelIntegrations,
        devtelWebhooks,
        devtelAgentSettings,
        devtelGithubWebhookLogs,
        devtelGithubCommits,
    }
}
