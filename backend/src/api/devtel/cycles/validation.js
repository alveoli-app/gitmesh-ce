"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSchema = exports.sprintPlanSchema = exports.cycleUpdateSchema = exports.cycleCreateSchema = void 0;
const joi_1 = __importDefault(require("joi"));
/**
 * Validation schema for creating a cycle
 */
exports.cycleCreateSchema = joi_1.default.object({
    name: joi_1.default.string()
        .min(1)
        .max(100)
        .required()
        .messages({
        'string.empty': 'Cycle name is required',
        'string.max': 'Cycle name must be less than 100 characters',
        'any.required': 'Cycle name is required'
    }),
    goal: joi_1.default.string()
        .max(500)
        .allow('', null)
        .messages({
        'string.max': 'Goal must be less than 500 characters'
    }),
    startDate: joi_1.default.date()
        .iso()
        .required()
        .messages({
        'date.base': 'Start date must be a valid date',
        'date.format': 'Start date must be in ISO format',
        'any.required': 'Start date is required'
    }),
    endDate: joi_1.default.date()
        .iso()
        .greater(joi_1.default.ref('startDate'))
        .required()
        .messages({
        'date.base': 'End date must be a valid date',
        'date.format': 'End date must be in ISO format',
        'date.greater': 'End date must be after start date',
        'any.required': 'End date is required'
    }),
    storyPointsTotal: joi_1.default.number()
        .integer()
        .min(0)
        .allow(null)
        .messages({
        'number.integer': 'Story points must be a whole number',
        'number.min': 'Story points must be 0 or greater'
    })
});
/**
 * Validation schema for updating a cycle
 */
exports.cycleUpdateSchema = joi_1.default.object({
    name: joi_1.default.string()
        .min(1)
        .max(100)
        .messages({
        'string.empty': 'Cycle name cannot be empty',
        'string.max': 'Cycle name must be less than 100 characters'
    }),
    goal: joi_1.default.string()
        .max(500)
        .allow('', null),
    startDate: joi_1.default.date()
        .iso()
        .messages({
        'date.format': 'Start date must be in ISO format'
    }),
    endDate: joi_1.default.date()
        .iso()
        .when('startDate', {
        is: joi_1.default.exist(),
        then: joi_1.default.date().greater(joi_1.default.ref('startDate')),
        otherwise: joi_1.default.date()
    })
        .messages({
        'date.format': 'End date must be in ISO format',
        'date.greater': 'End date must be after start date'
    }),
    storyPointsTotal: joi_1.default.number()
        .integer()
        .min(0)
        .allow(null),
    status: joi_1.default.string()
        .valid('planned', 'active', 'completed')
        .messages({
        'any.only': 'Status must be one of: planned, active, completed'
    })
}).min(1).messages({
    'object.min': 'At least one field must be provided for update'
});
/**
 * Validation schema for sprint planning
 */
exports.sprintPlanSchema = joi_1.default.object({
    issueIds: joi_1.default.array()
        .items(joi_1.default.string().uuid())
        .min(1)
        .max(100)
        .required()
        .messages({
        'array.min': 'At least one issue is required',
        'array.max': 'Maximum 100 issues can be planned at once',
        'any.required': 'Issue IDs are required',
        'string.guid': 'Each issue ID must be a valid UUID'
    })
});
/**
 * Helper function to validate and return formatted errors
 */
const validateSchema = (schema, data) => {
    const { error, value } = schema.validate(data, {
        abortEarly: false,
        stripUnknown: true
    });
    if (error) {
        const errors = {};
        error.details.forEach(detail => {
            const field = detail.path.join('.');
            errors[field] = detail.message;
        });
        return { isValid: false, errors, value: null };
    }
    return { isValid: true, errors: null, value };
};
exports.validateSchema = validateSchema;
//# sourceMappingURL=validation.js.map