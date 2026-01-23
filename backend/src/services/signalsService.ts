import { Error400, Error404 } from '@gitmesh/common'
import { LoggerBase } from '@gitmesh/logging'
import SignalsRepository from '../database/repositories/signalsRepository'
import { IServiceOptions } from './IServiceOptions'

export default class SignalsService extends LoggerBase {
  options: IServiceOptions

  constructor(options: IServiceOptions) {
    super(options.log)
    this.options = options
  }

  /**
   * Find signals with filtering, pagination, and sorting
   */
  async findAndCountAll(args) {
    return SignalsRepository.findAndCountAll(args, this.options)
  }

  /**
   * Find a single signal by ID
   */
  async findById(id) {
    const record = await SignalsRepository.findById(id, this.options)

    if (!record) {
      throw new Error404()
    }

    return record
  }

  /**
   * Export signals in various formats
   */
  async export(args) {
    return SignalsRepository.export(args, this.options)
  }

  /**
   * Stream export signals for large datasets
   */
  async streamExport(args, res) {
    return SignalsRepository.streamExport(args, res, this.options)
  }
}