import { LoggerBase } from '@gitmesh/logging'
import * as brevo from '@getbrevo/brevo'
import assert from 'assert'
import { API_CONFIG, BREVO_CONFIG } from '../conf'

export default class EmailSender extends LoggerBase {
  templateId: string

  variables: any

  tenantId: string

  private static brevoApi: brevo.TransactionalEmailsApi

  constructor(templateId, variables, tenantId = null) {
    super()
    this.templateId = templateId
    this.variables = variables
    this.tenantId = tenantId
    
    if (BREVO_CONFIG.apiKey && !EmailSender.brevoApi) {
      const apiInstance = new brevo.TransactionalEmailsApi()
      apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_CONFIG.apiKey)
      EmailSender.brevoApi = apiInstance
    }
  }

  static get TEMPLATES() {
    if (!EmailSender.isConfigured) {
      return {}
    }

    return {
      EMAIL_ADDRESS_VERIFICATION: BREVO_CONFIG.templateEmailAddressVerification,
      INVITATION: BREVO_CONFIG.templateInvitation,
      PASSWORD_RESET: BREVO_CONFIG.templatePasswordReset,
      WEEKLY_ANALYTICS: BREVO_CONFIG.templateWeeklyAnalytics,
      INTEGRATION_DONE: BREVO_CONFIG.templateIntegrationDone,
      CSV_EXPORT: BREVO_CONFIG.templateCsvExport,
      SIGNALS_DIGEST: BREVO_CONFIG.templateSignalsDigest,
    }
  }

  /**
   * Sends an email to given recipient using Brevo transactional templates.
   * @param {string} recipient recipient email address
   * @param listIds optional list IDs for contact management
   * @returns
   */
  async sendTo(recipient: string, listIds?: number[]): Promise<any> {
    if (!EmailSender.isConfigured) {
      this.log.error('Email provider is not configured.')
      return undefined
    }

    assert(recipient, 'to is required')
    assert(BREVO_CONFIG.emailFrom, 'BREVO_EMAIL_FROM is required')
    assert(this.templateId, 'templateId is required')

    const sendSmtpEmail = new brevo.SendSmtpEmail()
    sendSmtpEmail.to = [{ email: recipient }]
    sendSmtpEmail.sender = {
      name: BREVO_CONFIG.nameFrom,
      email: BREVO_CONFIG.emailFrom,
    }
    sendSmtpEmail.templateId = parseInt(this.templateId, 10)
    sendSmtpEmail.params = {
      ...this.variables,
      appHost: API_CONFIG.frontendUrl,
    }

    if (this.tenantId) {
      sendSmtpEmail.tags = [`tenant:${this.tenantId}`]
    }

    if (listIds && listIds.length > 0) {
      // Add contact to lists for unsubscribe management
      sendSmtpEmail.params.listIds = listIds
    }

    try {
      const result = await EmailSender.brevoApi.sendTransacEmail(sendSmtpEmail)
      return result
    } catch (error) {
      this.log.error(error, 'Error sending Brevo email.')
      throw error
    }
  }

  static get isConfigured() {
    return Boolean(BREVO_CONFIG.emailFrom && BREVO_CONFIG.apiKey)
  }
}
