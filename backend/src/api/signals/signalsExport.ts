import PermissionChecker from '../../services/user/permissionChecker'
import Permissions from '../../security/permissions'
import SignalsService from '../../services/signalsService'
import { SignalsValidation } from './validation/signalsValidation'
import track from '../../segment/track'

export default async (req, res) => {
  new PermissionChecker(req).validateHas(Permissions.values.activityRead)

  // Validate and sanitize query parameters
  const sanitizedQuery = SignalsValidation.sanitizeQuery(req.query)
  const validatedQuery = SignalsValidation.validateExportQuery(sanitizedQuery)

  // Track export usage
  track('Signals Exported', { 
    format: validatedQuery.format,
    hasDateFilter: !!(validatedQuery.startDate || validatedQuery.endDate)
  }, { ...req })

  // Check if this should be streamed (large exports)
  const shouldStream = validatedQuery.format === 'recommendations' || 
                      (validatedQuery.startDate && validatedQuery.endDate && 
                       new Date(validatedQuery.endDate).getTime() - new Date(validatedQuery.startDate).getTime() > 30 * 24 * 60 * 60 * 1000) // > 30 days

  if (shouldStream) {
    // Stream large exports using chunked transfer encoding
    await streamExport(req, res, validatedQuery)
  } else {
    // Regular export for smaller datasets
    const payload = await new SignalsService(req).export(validatedQuery)
    await req.responseHandler.success(req, res, payload)
  }
}

/**
 * Stream large exports using chunked transfer encoding
 */
async function streamExport(req, res, validatedQuery) {
  const signalsService = new SignalsService(req)
  
  // Set appropriate headers for streaming
  if (validatedQuery.format === 'recommendations') {
    res.setHeader('Content-Type', 'application/x-ndjson') // JSONL format
  } else {
    res.setHeader('Content-Type', 'application/json')
  }
  
  res.setHeader('Transfer-Encoding', 'chunked')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  
  try {
    // Stream the export in chunks
    await signalsService.streamExport(validatedQuery, res)
  } catch (error) {
    // If streaming fails, send error response
    if (!res.headersSent) {
      res.status(500).json({ error: 'Export failed', message: error.message })
    } else {
      // If headers already sent, we can only log the error
      req.log.error('Export streaming failed', { error: error.message })
      res.end()
    }
  }
}