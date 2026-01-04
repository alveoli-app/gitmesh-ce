import { ElNotification, ElMessage } from 'element-plus'

/**
 * Custom API Error class
 */
export class ApiError extends Error {
    constructor(message, code, field, details = {}) {
        super(message)
        this.name = 'ApiError'
        this.code = code
        this.field = field
        this.details = details
    }
}

/**
 * Error message mapping for common HTTP status codes
 */
const ERROR_MESSAGES = {
    400: 'Invalid request. Please check your input and try again.',
    401: 'Your session has expired. Please log in again.',
    403: 'You don\'t have permission to perform this action.',
    404: 'The requested resource was not found.',
    409: 'This action conflicts with existing data. Please refresh and try again.',
    422: 'Validation failed. Please check the highlighted fields.',
    429: 'Too many requests. Please wait a moment and try again.',
    500: 'Server error. Our team has been notified. Please try again later.',
    502: 'Service temporarily unavailable. Please try again in a moment.',
    503: 'Service is under maintenance. Please try again later.',
    504: 'Request timeout. Please check your connection and try again.'
}

/**
 * Handle API errors with user-friendly notifications
 * @param {Error} error - The error object
 * @param {string} context - Context of the operation (e.g., "Create Issue")
 * @returns {void}
 */
export const handleApiError = (error, context = '') => {
    // Network error (no response from server)
    if (!error.response) {
        ElNotification.error({
            title: 'Connection Error',
            message: 'Unable to connect to the server. Please check your internet connection.',
            duration: 5000,
            showClose: true
        })
        console.error('[Network Error]', error)
        return
    }

    const { status, data } = error.response
    const serverMessage = data?.message
    const fieldErrors = data?.errors

    // Handle field-specific validation errors (422)
    if (status === 422 && fieldErrors && typeof fieldErrors === 'object') {
        const errorCount = Object.keys(fieldErrors).length

        // Show individual field errors
        Object.entries(fieldErrors).forEach(([field, message], index) => {
            setTimeout(() => {
                ElMessage.error({
                    message: `${field}: ${message}`,
                    duration: 5000,
                    showClose: true,
                    offset: 60 + (index * 60) // Stack messages
                })
            }, index * 100) // Stagger appearance
        })

        // Show summary notification
        ElNotification.error({
            title: context ? `${context} Failed` : 'Validation Error',
            message: `${errorCount} field${errorCount > 1 ? 's' : ''} need${errorCount === 1 ? 's' : ''} attention`,
            duration: 4000,
            showClose: true
        })

        console.error(`[Validation Error] ${context}:`, fieldErrors)
        return
    }

    // Handle session expiration (401)
    if (status === 401) {
        ElNotification.warning({
            title: 'Session Expired',
            message: 'Your session has expired. Redirecting to login...',
            duration: 3000,
            showClose: true
        })

        // Redirect to login after a short delay
        setTimeout(() => {
            window.location.href = '/auth/signin'
        }, 2000)

        console.error('[Auth Error]', error)
        return
    }

    // Handle permission errors (403)
    if (status === 403) {
        ElNotification.error({
            title: 'Permission Denied',
            message: serverMessage || ERROR_MESSAGES[403],
            duration: 5000,
            showClose: true
        })
        console.error('[Permission Error]', error)
        return
    }

    // General error notification
    const message = serverMessage || ERROR_MESSAGES[status] || 'An unexpected error occurred. Please try again.'
    const title = context ? `${context} Failed` : 'Error'

    ElNotification.error({
        title,
        message,
        duration: 5000,
        showClose: true
    })

    // Log for debugging
    console.error(`[API Error] ${context}:`, {
        status,
        message: serverMessage,
        data,
        url: error.config?.url,
        method: error.config?.method
    })
}

/**
 * Wrapper function to handle errors for async operations
 * @param {Function} fn - Async function to execute
 * @param {string} context - Context of the operation
 * @returns {Promise} - Result of the function or throws error
 */
export const withErrorHandling = async (fn, context) => {
    try {
        return await fn()
    } catch (error) {
        handleApiError(error, context)
        throw error // Re-throw for component-level handling if needed
    }
}

/**
 * Success notification helper
 * @param {string} message - Success message
 * @param {string} title - Optional title
 */
export const showSuccess = (message, title = 'Success') => {
    ElNotification.success({
        title,
        message,
        duration: 3000,
        showClose: true
    })
}

/**
 * Info notification helper
 * @param {string} message - Info message
 * @param {string} title - Optional title
 */
export const showInfo = (message, title = 'Info') => {
    ElNotification.info({
        title,
        message,
        duration: 3000,
        showClose: true
    })
}

/**
 * Warning notification helper
 * @param {string} message - Warning message
 * @param {string} title - Optional title
 */
export const showWarning = (message, title = 'Warning') => {
    ElNotification.warning({
        title,
        message,
        duration: 4000,
        showClose: true
    })
}

export default {
    handleApiError,
    withErrorHandling,
    showSuccess,
    showInfo,
    showWarning,
    ApiError
}
