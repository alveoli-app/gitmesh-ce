"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../../security/permissions"));
const tagService_1 = __importDefault(require("../../services/tagService"));
const permissionChecker_1 = __importDefault(require("../../services/user/permissionChecker"));
exports.default = async (req, res) => {
    new permissionChecker_1.default(req).validateHas(permissions_1.default.values.tagAutocomplete);
    // Handle both flat and nested query parameter formats
    let query = req.query.query;
    let limit = req.query.limit;
    // If query is an object (nested format from frontend), extract the values
    if (typeof query === 'object' && query !== null) {
        limit = query.limit || limit;
        query = query.query || '';
    }
    const payload = await new tagService_1.default(req).findAllAutocomplete(query, limit);
    await req.responseHandler.success(req, res, payload);
};
//# sourceMappingURL=tagAutocomplete.js.map