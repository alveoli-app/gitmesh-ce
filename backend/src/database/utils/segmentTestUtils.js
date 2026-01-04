"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.populateSegments = populateSegments;
exports.switchSegments = switchSegments;
const segmentRepository_1 = __importDefault(require("../repositories/segmentRepository"));
async function populateSegments(options) {
    const repository = new segmentRepository_1.default(options);
    options.currentSegments = await Promise.all(options.currentSegments.map(async (segment) => repository.findById(segment.id)));
}
function switchSegments(options, segments) {
    options.currentSegments = segments;
}
//# sourceMappingURL=segmentTestUtils.js.map