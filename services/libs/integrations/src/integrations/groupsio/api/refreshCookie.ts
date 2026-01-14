import axios, { AxiosRequestConfig } from 'axios'
import * as crypto from 'crypto'
import * as buffer from 'buffer'
import { IProcessStreamContext } from '../../../types'
import { GroupsioIntegrationSettings } from '../types'

/**
 * Decrypts a string encrypted with AES-256-GCM
 * @param encryptedText - The encrypted text in format: iv:authTag:encryptedData
 * @param secretKey - The secret key used for encryption
 * @returns Decrypted string
 */
const decrypt = (encryptedText: string, secretKey: string): string => {
  const algorithm = 'aes-256-gcm'
  const key = crypto.scryptSync(secretKey, 'salt', 32)
  const parts = encryptedText.split(':')

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format')
  }

  const iv = buffer.Buffer.from(parts[0], 'base64')
  const authTag = buffer.Buffer.from(parts[1], 'base64')
  const encrypted = parts[2]

  const decipher = crypto.createDecipheriv(algorithm, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, 'base64', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Refreshes the Groups.io cookie using stored encrypted password
 * @param ctx - The process stream context
 * @returns The new cookie string
 * @throws Error if refresh fails
 */
export const refreshGroupsioCookie = async (ctx: IProcessStreamContext): Promise<string> => {
  const settings = ctx.integration.settings as GroupsioIntegrationSettings & {
    encryptedPassword?: string
  }

  if (!settings.encryptedPassword) {
    throw new Error(
      'Cannot refresh Groups.io cookie: no encrypted password stored. Please reconnect the integration.',
    )
  }

  if (!settings.email) {
    throw new Error('Cannot refresh Groups.io cookie: email not found in settings')
  }

  // Decrypt password
  const encryptionKey = process.env.GROUPSIO_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || 'default-key-change-in-production'
  let password: string
  try {
    password = decrypt(settings.encryptedPassword, encryptionKey)
  } catch (decryptErr) {
    ctx.log.error(decryptErr, 'Failed to decrypt Groups.io password')
    throw new Error('Failed to decrypt stored credentials. Please reconnect the integration.')
  }

  // Get new token from Groups.io
  const config: AxiosRequestConfig = {
    method: 'post',
    url: 'https://groups.io/api/v1/login',
    params: {
      email: settings.email,
      password: password,
    },
    headers: {
      'Content-Type': 'application/json',
    },
  }

  try {
    const response = await axios(config)

    if (!response.headers['set-cookie'] || !response.headers['set-cookie'][0]) {
      throw new Error('No set-cookie header in Groups.io login response')
    }

    const newCookie = response.headers['set-cookie'][0].split(';')[0]

    if (!newCookie) {
      throw new Error('Invalid cookie format in Groups.io login response')
    }

    // Update integration settings with new cookie
    await ctx.updateIntegrationSettings({
      ...settings,
      token: newCookie,
      lastTokenRefresh: Date.now(),
    })

    ctx.log.info(
      { integrationId: ctx.integration.id, refreshTime: new Date().toISOString() },
      'Groups.io cookie refreshed successfully',
    )

    return newCookie
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.data) {
      if ('two_factor_required' in err.response.data) {
        throw new Error(
          'Two-factor authentication is required. Please reconnect the integration with your 2FA code.',
        )
      }
    }

    ctx.log.error(err, 'Failed to refresh Groups.io cookie')
    throw new Error('Failed to refresh authentication. Please check your credentials and reconnect the integration.')
  }
}

