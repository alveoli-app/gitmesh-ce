import * as brevo from '@getbrevo/brevo'

import { EmailToSend, EmailSent } from '../../types/email'

/*
sendEmail is a Temporal activity that sends an email to a user's email address
using the Brevo API.
*/
export async function sendEmail(toSend: EmailToSend): Promise<EmailSent> {
  const apiInstance = new brevo.TransactionalEmailsApi()
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env['BREVO_API_KEY'])

  const sendSmtpEmail = new brevo.SendSmtpEmail()
  sendSmtpEmail.to = [{ email: toSend.email }]
  sendSmtpEmail.sender = {
    name: process.env['BREVO_NAME_FROM'],
    email: process.env['BREVO_EMAIL_FROM'],
  }
  sendSmtpEmail.templateId = parseInt(process.env['BREVO_TEMPLATE_WEEKLY_ANALYTICS'], 10)
  sendSmtpEmail.params = {
    ...toSend.content,
    appHost: process.env['API_FRONTEND_URL'],
  }

  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail)
  } catch (err) {
    throw new Error(err)
  }

  return {
    sentAt: new Date(),
  }
}
