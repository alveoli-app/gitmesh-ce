import Joi from 'joi'

/**
 * Validation schema for creating an issue
 */
export const issueCreateSchema = Joi.object({
    title: Joi.string()
        .min(1)
        .max(255)
        .required()
        .messages({
            'string.empty': 'Title is required',
            'string.min': 'Title must be at least 1 character',
            'string.max': 'Title must be less than 255 characters',
            'any.required': 'Title is required'
        }),

    description: Joi.string()
        .max(10000)
        .allow('', null)
        .messages({
            'string.max': 'Description must be less than 10,000 characters'
        }),

    status: Joi.string()
        .valid('backlog', 'todo', 'in_progress', 'review', 'done')
        .default('backlog')
        .messages({
            'any.only': 'Status must be one of: backlog, todo, in_progress, review, done'
        }),

    priority: Joi.string()
        .valid('urgent', 'high', 'medium', 'low')
        .default('medium')
        .messages({
            'any.only': 'Priority must be one of: urgent, high, medium, low'
        }),

    estimatedHours: Joi.number()
        .min(0)
        .max(1000)
        .allow(null)
        .messages({
            'number.min': 'Estimated hours must be 0 or greater',
            'number.max': 'Estimated hours must be less than 1000',
            'number.base': 'Estimated hours must be a number'
        }),

    storyPoints: Joi.number()
        .integer()
        .min(0)
        .max(100)
        .allow(null)
        .messages({
            'number.integer': 'Story points must be a whole number',
            'number.min': 'Story points must be 0 or greater',
            'number.max': 'Story points must be less than 100'
        }),

    assigneeId: Joi.string()
        .uuid()
        .allow(null)
        .messages({
            'string.guid': 'Assignee ID must be a valid UUID'
        }),

    assigneeMemberId: Joi.string()
        .uuid()
        .allow(null)
        .messages({
            'string.guid': 'Assignee Member ID must be a valid UUID'
        }),

    cycleId: Joi.string()
        .uuid()
        .allow(null)
        .messages({
            'string.guid': 'Cycle ID must be a valid UUID'
        }),

    parentIssueId: Joi.string()
        .uuid()
        .allow(null)
        .messages({
            'string.guid': 'Parent issue ID must be a valid UUID'
        }),

    labels: Joi.array()
        .items(Joi.string().max(50))
        .max(10)
        .messages({
            'array.max': 'Maximum 10 labels allowed',
            'string.max': 'Each label must be less than 50 characters'
        }),

    dueDate: Joi.date()
        .iso()
        .allow(null)
        .messages({
            'date.format': 'Due date must be a valid ISO date'
        })
})

/**
 * Validation schema for updating an issue
 */
export const issueUpdateSchema = Joi.object({
    title: Joi.string()
        .min(1)
        .max(255)
        .messages({
            'string.empty': 'Title cannot be empty',
            'string.max': 'Title must be less than 255 characters'
        }),

    description: Joi.string()
        .max(10000)
        .allow('', null),

    status: Joi.string()
        .valid('backlog', 'todo', 'in_progress', 'review', 'done'),

    priority: Joi.string()
        .valid('urgent', 'high', 'medium', 'low'),

    estimatedHours: Joi.number()
        .min(0)
        .max(1000)
        .allow(null),

    storyPoints: Joi.number()
        .integer()
        .min(0)
        .max(100)
        .allow(null),

    assigneeId: Joi.string()
        .uuid()
        .allow(null),

    assigneeMemberId: Joi.string()
        .uuid()
        .allow(null),

    cycleId: Joi.string()
        .uuid()
        .allow(null),

    parentIssueId: Joi.string()
        .uuid()
        .allow(null),

    labels: Joi.array()
        .items(Joi.string().max(50))
        .max(10),

    dueDate: Joi.date()
        .iso()
        .allow(null)
}).min(1).messages({
    'object.min': 'At least one field must be provided for update'
})

/**
 * Validation schema for bulk update
 */
export const issueBulkUpdateSchema = Joi.object({
    issueIds: Joi.array()
        .items(Joi.string().uuid())
        .min(1)
        .max(100)
        .required()
        .messages({
            'array.min': 'At least one issue ID is required',
            'array.max': 'Maximum 100 issues can be updated at once',
            'any.required': 'Issue IDs are required'
        }),

    status: Joi.string()
        .valid('backlog', 'todo', 'in_progress', 'review', 'done'),

    priority: Joi.string()
        .valid('urgent', 'high', 'medium', 'low'),

    assigneeId: Joi.string()
        .uuid()
        .allow(null),

    cycleId: Joi.string()
        .uuid()
        .allow(null)
}).min(2).messages({
    'object.min': 'At least one update field must be provided along with issue IDs'
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
