import Joi from 'joi'

/**
 * Validation schema for creating a cycle
 */
export const cycleCreateSchema = Joi.object({
    name: Joi.string()
        .min(1)
        .max(100)
        .required()
        .messages({
            'string.empty': 'Cycle name is required',
            'string.max': 'Cycle name must be less than 100 characters',
            'any.required': 'Cycle name is required'
        }),

    goal: Joi.string()
        .max(500)
        .allow('', null)
        .messages({
            'string.max': 'Goal must be less than 500 characters'
        }),

    startDate: Joi.any()
        .required()
        .messages({
            'any.required': 'Start date is required'
        }),

    endDate: Joi.any()
        .required()
        .messages({
            'any.required': 'End date is required'
        }),

    storyPointsTotal: Joi.number()
        .integer()
        .min(0)
        .allow(null)
        .messages({
            'number.integer': 'Story points must be a whole number',
            'number.min': 'Story points must be 0 or greater'
        })
})

/**
 * Validation schema for updating a cycle
 */
export const cycleUpdateSchema = Joi.object({
    name: Joi.string()
        .min(1)
        .max(100)
        .messages({
            'string.empty': 'Cycle name cannot be empty',
            'string.max': 'Cycle name must be less than 100 characters'
        }),

    goal: Joi.string()
        .max(500)
        .allow('', null),

    startDate: Joi.date()
        .iso()
        .messages({
            'date.format': 'Start date must be in ISO format'
        }),

    endDate: Joi.date()
        .iso()
        .when('startDate', {
            is: Joi.exist(),
            then: Joi.date().greater(Joi.ref('startDate')),
            otherwise: Joi.date()
        })
        .messages({
            'date.format': 'End date must be in ISO format',
            'date.greater': 'End date must be after start date'
        }),

    storyPointsTotal: Joi.number()
        .integer()
        .min(0)
        .allow(null),

    status: Joi.string()
        .valid('planned', 'active', 'completed')
        .messages({
            'any.only': 'Status must be one of: planned, active, completed'
        })
}).min(1).messages({
    'object.min': 'At least one field must be provided for update'
})

/**
 * Validation schema for sprint planning
 */
export const sprintPlanSchema = Joi.object({
    issueIds: Joi.array()
        .items(Joi.string().uuid())
        .min(1)
        .max(100)
        .required()
        .messages({
            'array.min': 'At least one issue is required',
            'array.max': 'Maximum 100 issues can be planned at once',
            'any.required': 'Issue IDs are required',
            'string.guid': 'Each issue ID must be a valid UUID'
        })
})

/**
 * Helper function to validate and return formatted errors
 */
export const validateSchema = (schema: Joi.ObjectSchema, data: any) => {
    const { error, value } = schema.validate(data, {
        abortEarly: false,
        stripUnknown: true
    })

    if (error) {
        const errors: Record<string, string> = {}
        error.details.forEach(detail => {
            const field = detail.path.join('.')
            errors[field] = detail.message
        })
        return { isValid: false, errors, value: null }
    }

    return { isValid: true, errors: null, value }
}
