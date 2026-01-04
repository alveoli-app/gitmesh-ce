"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../services/user/permissionChecker"));
const crypto_1 = require("crypto");
/**
 * Generate a compliance export
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberRead);
    const { startDate, endDate, agentIds, actionTypes } = req.body;
    const where = {
        tenantId: req.currentTenant.id,
    };
    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate)
            where.createdAt[req.database.Sequelize.Op.gte] = new Date(startDate);
        if (endDate)
            where.createdAt[req.database.Sequelize.Op.lte] = new Date(endDate);
    }
    if (agentIds && agentIds.length > 0) {
        where.agentId = { [req.database.Sequelize.Op.in]: agentIds };
    }
    if (actionTypes && actionTypes.length > 0) {
        where.actionType = { [req.database.Sequelize.Op.in]: actionTypes };
    }
    // Fetch actions
    const actions = await req.database.chatExecutedActions.findAll({
        where,
        order: [['createdAt', 'ASC']],
        include: [
            {
                model: req.database.user,
                as: 'executor',
                attributes: ['id', 'fullName', 'email'],
            },
        ],
    });
    // Generate CSV content
    const headers = ['Action ID', 'Timestamp', 'Agent', 'Action Type', 'Status', 'Executor', 'Duration (ms)', 'Error'];
    const rows = actions.map((a) => {
        var _a;
        return [
            a.id,
            a.createdAt.toISOString(),
            a.agentId,
            a.actionType,
            a.status,
            ((_a = a.executor) === null || _a === void 0 ? void 0 : _a.email) || 'System',
            a.durationMs,
            a.errorMessage || '',
        ];
    });
    const csvContent = [
        headers.join(','),
        ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    // Sign the content
    const secret = process.env.COMPLIANCE_SECRET || 'dev-secret';
    const signatureHash = (0, crypto_1.createHmac)('sha256', secret).update(csvContent).digest('hex');
    // Store record
    const exportRecord = await req.database.complianceExports.create({
        tenantId: req.currentTenant.id,
        generatedBy: req.currentUser.id,
        criteria: req.body,
        signatureHash,
        fileUrl: null, // In real impl, upload to S3. Here just storing metadata or we could store blob if small
        format: 'csv',
        actionCount: actions.length,
    });
    // Return the content directly for download in this MVP
    await req.responseHandler.success(req, res, {
        export: exportRecord.get({ plain: true }),
        content: csvContent,
    });
};
//# sourceMappingURL=complianceCreate.js.map