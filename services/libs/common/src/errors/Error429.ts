import { i18n, i18nExists } from '../i18n'

export default class Error429 extends Error {
  code: number

  constructor(language?, messageCode?, ...args) {
    let message

    if (messageCode && i18nExists(language, messageCode)) {
      message = i18n(language, messageCode, ...args)
    }

    message = message || i18n(language, 'errors.tooManyRequests.message') || 'Too Many Requests'

    super(message)
    this.code = 429
  }
}