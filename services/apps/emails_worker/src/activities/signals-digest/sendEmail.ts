import moment from 'moment'
import * as brevo from '@getbrevo/brevo'

import { EmailToSend, EmailSent } from '../../types/email'
/*
sendEmail is a Temporal activity that sends an Signals digest email to a user's
email address using the Brevo API.
*/
export async function sendEmail(toSend: EmailToSend): Promise<EmailSent> {
  const apiInstance = new brevo.TransactionalEmailsApi()
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env['BREVO_API_KEY'])

  const sendSmtpEmail = new brevo.SendSmtpEmail()
  sendSmtpEmail.to = [{ email: toSend.settings.signals.emailDigest.email }]
  sendSmtpEmail.sender = {
    name: process.env['BREVO_NAME_FROM'],
    email: process.env['BREVO_EMAIL_FROM'],
  }
  sendSmtpEmail.templateId = parseInt(process.env['BREVO_TEMPLATE_SIGNALS_DIGEST'], 10)
  sendSmtpEmail.params = {
    content: toSend.content,
    frequency: toSend.settings.signals.emailDigest.frequency,
    date: moment().format('D MMM YYYY'),
    appHost: process.env['API_FRONTEND_URL'],
  }
  sendSmtpEmail.tags = [`tenant:${toSend.tenantId}`, `user:${toSend.userId}`]

  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail)
  } catch (err) {
    throw new Error(err)
  }

  return {
    sentAt: new Date(),
  }
}
