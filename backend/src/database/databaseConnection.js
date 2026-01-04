"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseInit = databaseInit;
const models_1 = __importDefault(require("./models"));
let cached;
/**
 * Initializes the connection to the Database
 */
async function databaseInit(queryTimeoutMilliseconds = 30000, forceNewInstance = false) {
    if (forceNewInstance) {
        return (0, models_1.default)(queryTimeoutMilliseconds);
    }
    if (!cached) {
        cached = (0, models_1.default)(queryTimeoutMilliseconds);
    }
    return cached;
}
//# sourceMappingURL=databaseConnection.js.map