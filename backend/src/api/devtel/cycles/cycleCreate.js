"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const devtelCycleService_1 = __importDefault(require("../../../services/devtel/devtelCycleService"));
const validation_1 = require("./validation");
/**
 * POST /tenant/{tenantId}/devtel/projects/:projectId/cycles
 * @summary Create a new cycle
 * @tag DevTel Cycles
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberCreate);
    // Validate input
    const inputData = req.body.data || req.body;
    const validation = (0, validation_1.validateSchema)(validation_1.cycleCreateSchema, inputData);
    if (!validation.isValid) {
        return res.status(422).json({
            message: 'Validation failed',
            errors: validation.errors
        });
    }
    const service = new devtelCycleService_1.default(req);
    const cycle = await service.create(req.params.projectId, validation.value);
    await req.responseHandler.success(req, res, cycle);
};
//# sourceMappingURL=cycleCreate.js.map