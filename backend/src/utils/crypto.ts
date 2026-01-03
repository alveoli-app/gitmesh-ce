import * as crypto from 'crypto'
import * as buffer from 'buffer'

export function generateWebhookSecret(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

export function verifyWebhookSignature(
  payload: string,
  secret: string,
  signatureHeader: string,
): boolean {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload)
  const expectedSignature = `sha256=${hmac.digest('hex')}`

  return crypto.timingSafeEqual(
    buffer.Buffer.from(signatureHeader),
    buffer.Buffer.from(expectedSignature),
  )
}

/**
 * Encrypts a string using AES-256-GCM
 * @param text - The text to encrypt
 * @param secretKey - The secret key (should be 32 bytes for AES-256)
 * @returns Encrypted string in format: iv:authTag:encryptedData (all base64 encoded)
 */
export function encrypt(text: string, secretKey: string): string {
  const algorithm = 'aes-256-gcm'
  const key = crypto.scryptSync(secretKey, 'salt', 32)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, key, iv)

  let encrypted = cipher.update(text, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  const authTag = cipher.getAuthTag()

  // Return format: iv:authTag:encryptedData (all base64)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
}

/**
 * Decrypts a string encrypted with encrypt()
 * @param encryptedText - The encrypted text in format: iv:authTag:encryptedData
 * @param secretKey - The secret key used for encryption
 * @returns Decrypted string
 */
export function decrypt(encryptedText: string, secretKey: string): string {
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