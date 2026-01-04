"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../../security/permissions"));
const permissionChecker_1 = __importDefault(require("../../../services/user/permissionChecker"));
const devtelAiService_1 = __importDefault(require("../../../services/devtel/devtelAiService"));
/**
 * POST /tenant/{tenantId}/devtel/ai/generate-spec
 * @summary Generate a product spec/PRD using AI
 * @tag DevTel AI
 * @security Bearer
 */
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.memberRead);
    const { title, description, projectId } = req.body;
    const service = new devtelAiService_1.default(req);
    const result = await service.generateSpec({
        title,
        description,
        projectId,
    });
    await req.responseHandler.success(req, res, result);
};
//# sourceMappingURL=generateSpec.js.map