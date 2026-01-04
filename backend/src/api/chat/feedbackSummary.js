"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../services/user/permissionChecker"));
/**
 * Get feedback summary for agents
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberRead);
    const startDate = req.query.startDate
        ? new Date(req.query.startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    const where = {
        tenantId: req.currentTenant.id,
        createdAt: { [req.database.Sequelize.Op.gte]: startDate },
    };
    if (req.query.agentId) {
        where.agentId = req.query.agentId;
    }
    // Get rating distribution by agent
    const byAgent = await req.database.agentFreeeback.findAll({
        where,
        attributes: [
            'agentId',
            [req.database.Sequelize.fn('COUNT', '*'), 'totalFeedback'],
            [req.database.Sequelize.fn('AVG', req.database.Sequelize.col('rating')), 'avgRating'],
            [req.database.Sequelize.fn('SUM', req.database.Sequelize.literal('CASE WHEN rating >= 4 THEN 1 ELSE 0 END')), 'positiveCount'],
            [req.database.Sequelize.fn('SUM', req.database.Sequelize.literal('CASE WHEN rating <= 2 THEN 1 ELSE 0 END')), 'negativeCount'],
        ],
        group: ['agentId'],
    });
    // Get category distribution
    const byCategory = await req.database.agentFeedback.findAll({
        where: Object.assign(Object.assign({}, where), { rating: { [req.database.Sequelize.Op.lte]: 3 } }),
        attributes: [
            [req.database.Sequelize.fn('unnest', req.database.Sequelize.col('categories')), 'category'],
            [req.database.Sequelize.fn('COUNT', '*'), 'count'],
        ],
        group: [req.database.Sequelize.fn('unnest', req.database.Sequelize.col('categories'))],
        order: [[req.database.Sequelize.fn('COUNT', '*'), 'DESC']],
    });
    // Get recent negative feedback with comments
    const recentNegative = await req.database.agentFeedback.findAll({
        where: Object.assign(Object.assign({}, where), { rating: { [req.database.Sequelize.Op.lte]: 2 }, comment: { [req.database.Sequelize.Op.ne]: null } }),
        order: [['createdAt', 'DESC']],
        limit: 10,
        include: [
            {
                model: req.database.chatMessages,
                as: 'message',
                attributes: ['id', 'content'],
            },
        ],
    });
    await req.responseHandler.success(req, res, {
        byAgent: byAgent.map(a => {
            const plain = a.get({ plain: true });
            return {
                agentId: plain.agentId,
                totalFeedback: parseInt(plain.totalFeedback),
                avgRating: parseFloat(plain.avgRating || 0).toFixed(1),
                approvalRate: plain.totalFeedback > 0
                    ? Math.round((parseInt(plain.positiveCount) / parseInt(plain.totalFeedback)) * 100)
                    : 100,
            };
        }),
        byCategory: byCategory.map(c => ({
            category: c.get('category'),
            count: parseInt(c.get('count')),
        })),
        recentNegative: recentNegative.map(f => f.get({ plain: true })),
    });
};
//# sourceMappingURL=feedbackSummary.js.map