"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissionChecker_1 = __importDefault(require("../../services/user/permissionChecker"));
const permissions_1 = __importDefault(require("../../security/permissions"));
const segmentService_1 = __importDefault(require("../../services/segmentService"));
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.segmentRead);
    const payload = await new segmentService_1.default(req).list();
    await req.responseHandler.success(req, res, payload);
};
//# sourceMappingURL=segmentList.js.map