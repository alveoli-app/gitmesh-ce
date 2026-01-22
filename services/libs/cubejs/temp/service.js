"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CubeJsService = void 0;
var jsonwebtoken_1 = require("jsonwebtoken");
var core_1 = require("@cubejs-client/core");
var common_1 = require("@gitmesh/common");
var CubeJsService = /** @class */ (function () {
    function CubeJsService() {
    }
    /**
     * Sets tenant security context for cubejs api.
     * Also initializes cubejs api object from security context.
     * @param tenantId
     * @param segments
     */
    CubeJsService.prototype.init = function (tenantId, segments) {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.tenantId = tenantId;
                        this.segments = segments;
                        _a = this;
                        return [4 /*yield*/, CubeJsService.generateJwtToken(this.tenantId, this.segments)];
                    case 1:
                        _a.token = _b.sent();
                        this.api = (0, core_1.default)(this.token, { apiUrl: process.env['CUBEJS_URL'] });
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Loads the result data for a given cubejs query
     * @param query
     * @returns
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    CubeJsService.prototype.load = function (query) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.api.load(query)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.loadResponses[0].data];
                }
            });
        });
    };
    CubeJsService.generateJwtToken = function (tenantId, segments) {
        return __awaiter(this, void 0, void 0, function () {
            var context, token;
            return __generator(this, function (_a) {
                context = { tenantId: tenantId, segments: segments };
                token = jsonwebtoken_1.default.sign(context, process.env['CUBEJS_JWT_SECRET'], {
                    expiresIn: process.env['CUBEJS_JWT_EXPIRY'],
                });
                return [2 /*return*/, token];
            });
        });
    };
    CubeJsService.verifyToken = function (language, token, tenantId) {
        return __awaiter(this, void 0, void 0, function () {
            var decodedToken;
            return __generator(this, function (_a) {
                try {
                    decodedToken = jsonwebtoken_1.default.verify(token, process.env['CUBEJS_JWT_SECRET']);
                    if (decodedToken.tenantId !== tenantId) {
                        throw new common_1.Error400(language, 'cubejs.tenantIdNotMatching');
                    }
                }
                catch (error) {
                    if (error instanceof jsonwebtoken_1.JsonWebTokenError) {
                        throw new common_1.Error400(language, 'cubejs.invalidToken');
                    }
                    throw error;
                }
                return [2 /*return*/];
            });
        });
    };
    return CubeJsService;
}());
exports.CubeJsService = CubeJsService;
