import { proxyActivities, log } from '@temporalio/workflow'
import type * as activities from '../activities/modelUpdateActivities'

export interface ModelUpdateWorkflowArgs {
  tenantId?: string
  modelTypes?: string[] // ['product_area', 'intent', 'urgency']
  validationThreshold?: number // Minimum accuracy threshold for model deployment
}

export interface ModelUpdateResult {
  modelsRetrained: string[]
  modelsFailed: string[]
  validationResults: Record<string, {
    accuracy: number
    precision: number
    recall: number
    f1Score: number
    deployed: boolean
  }>
  scoringParametersUpdated: boolean
  duration: number
  labeledDataCount: number
}

// Configure activity timeouts for model training (longer timeouts needed)
const activity = proxyActivities<typeof activities>({
  startToCloseTimeout: '30m', // 30 minutes for model training
  scheduleToCloseTimeout: '60m', // 1 hour total workflow timeout
  retry: {
    maximumAttempts: 2, // Fewer retries for expensive operations
    initialInterval: '30s',
    backoffCoefficient: 2.0,
    maximumInterval: '5m',
  },
})

/**
 * Model Update Workflow
 * 
 * Orchestrates the daily retraining of classification models and updating of scoring parameters.
 * Fetches labeled data from manual reviews, retrains models, validates performance, and deploys
 * new models if they meet quality thresholds.
 * 
 * Requirements: 22.5 - Create separate daily workflow for model retraining
 */
export async function modelUpdateWorkflow(
  args: ModelUpdateWorkflowArgs = {}
): Promise<ModelUpdateResult> {
  const startTime = Date.now()
  const { 
    tenantId, 
    modelTypes = ['product_area', 'intent', 'urgency'],
    validationThreshold = 0.75 // 75% minimum accuracy
  } = args

  log.info('Starting model update workflow', { 
    tenantId, 
    modelTypes, 
    validationThreshold 
  })

  const result: ModelUpdateResult = {
    modelsRetrained: [],
    modelsFailed: [],
    validationResults: {},
    scoringParametersUpdated: false,
    duration: 0,
    labeledDataCount: 0,
  }

  try {
    // Step 1: Fetch labeled data from manual reviews
    log.info('Fetching labeled data from manual reviews')
    const labeledData = await activity.fetchLabeledData(tenantId)
    result.labeledDataCount = labeledData.totalCount

    if (labeledData.totalCount === 0) {
      log.info('No new labeled data found, skipping model retraining')
      result.duration = Date.now() - startTime
      return result
    }

    log.info('Labeled data retrieved', { 
      totalCount: labeledData.totalCount,
      productAreaLabels: labeledData.productAreaCount,
      intentLabels: labeledData.intentCount,
      urgencyLabels: labeledData.urgencyCount,
    })

    // Step 2: Retrain classification models
    for (const modelType of modelTypes) {
      try {
        log.info(`Retraining ${modelType} model`)
        
        // Check if we have enough labeled data for this model type
        const hasEnoughData = await activity.validateTrainingDataSufficiency(
          modelType, 
          labeledData
        )

        if (!hasEnoughData) {
          log.warn(`Insufficient training data for ${modelType} model, skipping`)
          continue
        }

        // Retrain the model
        const trainingResult = await activity.retrainModel(modelType, labeledData)
        
        if (trainingResult.success) {
          log.info(`${modelType} model retrained successfully`, {
            trainingAccuracy: trainingResult.trainingAccuracy,
            trainingTime: trainingResult.trainingTime,
          })

          // Step 3: Validate model performance on holdout set
          log.info(`Validating ${modelType} model performance`)
          const validationResult = await activity.validateModel(
            modelType, 
            trainingResult.modelPath
          )

          result.validationResults[modelType] = validationResult

          // Step 4: Deploy new model if it meets quality threshold
          if (validationResult.accuracy >= validationThreshold) {
            log.info(`${modelType} model meets quality threshold, deploying`, {
              accuracy: validationResult.accuracy,
              threshold: validationThreshold,
            })

            const deployResult = await activity.deployModel(
              modelType, 
              trainingResult.modelPath,
              validationResult
            )

            if (deployResult.success) {
              result.modelsRetrained.push(modelType)
              result.validationResults[modelType].deployed = true
              log.info(`${modelType} model deployed successfully`)
            } else {
              log.error(`Failed to deploy ${modelType} model`, {
                error: deployResult.error,
              })
              result.modelsFailed.push(modelType)
            }
          } else {
            log.warn(`${modelType} model does not meet quality threshold`, {
              accuracy: validationResult.accuracy,
              threshold: validationThreshold,
            })
            result.modelsFailed.push(modelType)
          }
        } else {
          log.error(`Failed to retrain ${modelType} model`, {
            error: trainingResult.error,
          })
          result.modelsFailed.push(modelType)
        }

      } catch (error) {
        log.error(`Error processing ${modelType} model`, { error: error.message })
        result.modelsFailed.push(modelType)
      }
    }

    // Step 5: Update scoring parameters based on new data patterns
    if (result.modelsRetrained.length > 0) {
      try {
        log.info('Updating scoring parameters')
        const scoringUpdateResult = await activity.updateScoringParameters(
          labeledData,
          result.modelsRetrained
        )

        if (scoringUpdateResult.success) {
          result.scoringParametersUpdated = true
          log.info('Scoring parameters updated successfully', {
            updatedParameters: scoringUpdateResult.updatedParameters,
          })
        } else {
          log.error('Failed to update scoring parameters', {
            error: scoringUpdateResult.error,
          })
        }
      } catch (error) {
        log.error('Error updating scoring parameters', { error: error.message })
      }
    }

    result.duration = Date.now() - startTime

    log.info('Model update workflow completed', {
      modelsRetrained: result.modelsRetrained,
      modelsFailed: result.modelsFailed,
      scoringParametersUpdated: result.scoringParametersUpdated,
      duration: `${Math.round(result.duration / 1000)}s`,
    })

    return result

  } catch (error) {
    result.duration = Date.now() - startTime
    log.error('Model update workflow failed', { 
      error: error.message,
      duration: `${Math.round(result.duration / 1000)}s`,
      tenantId 
    })
    
    throw error
  }
}