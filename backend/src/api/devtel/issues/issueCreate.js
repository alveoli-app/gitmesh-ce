"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const devtelIssueService_1 = __importDefault(require("../../../services/devtel/devtelIssueService"));
const validation_1 = require("./validation");
/**
 * POST /tenant/{tenantId}/devtel/projects/:projectId/issues
 * @summary Create a new issue
 * @tag DevTel Issues
 * @security Bearer
 */
exports.default = async (req, res) => {
    try {
        new permissionChecker_1.default(req).validateHas(permissions_1.default.values.taskCreate);
        // Validate input
        const inputData = req.body.data || req.body;
        const validation = (0, validation_1.validateSchema)(validation_1.issueCreateSchema, inputData);
        if (!validation.isValid) {
            return res.status(422).json({
                message: 'Validation failed',
                errors: validation.errors
            });
        }
        const service = new devtelIssueService_1.default(req);
        const issue = await service.create(req.params.projectId, validation.value);
        await req.responseHandler.success(req, res, issue);
    }
    catch (error) {
        console.error('Issue Creation Error:', error.message);
        await req.responseHandler.error(req, res, error);
    }
};
//# sourceMappingURL=issueCreate.js.map