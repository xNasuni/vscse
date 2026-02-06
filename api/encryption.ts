import crypto from 'crypto'
import { unprotectData } from './win/dpapi'
import { readFileSync } from 'fs'

let cachedRawKey: Uint8Array | null = null

export function getRawKey(keyPath: string): Uint8Array {
    if (cachedRawKey) {
        return cachedRawKey
    }

    const localStateKeyBase64 = JSON.parse(
        readFileSync(keyPath).toString('ascii'),
    ).os_crypt.encrypted_key

    if (process.platform === 'win32') {
        const encryptedKey = Buffer.from(
            localStateKeyBase64,
            'base64',
        ).subarray(5)
        cachedRawKey = unprotectData(encryptedKey, null, 'CurrentUser')
        return cachedRawKey
    }

    throw new Error(
        `Decryption not yet implemented for platform: ${process.platform}`,
    )
}

export function decrypt(encryptedBuffer: Buffer, rawKey: Uint8Array): Buffer {
    const version = encryptedBuffer.subarray(0, 3).toString('ascii')
    if (version !== 'v10') {
        throw new Error(`${version} is not a supported encryption version`)
    }

    const nonce = encryptedBuffer.subarray(3, 15)
    const ciphertext = encryptedBuffer.subarray(15, encryptedBuffer.length - 16)
    const authTag = encryptedBuffer.subarray(encryptedBuffer.length - 16)

    const decipher = crypto.createDecipheriv('aes-256-gcm', rawKey, nonce)
    decipher.setAuthTag(authTag)

    return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}

export function encrypt(plaintext: Buffer, rawKey: Uint8Array): Buffer {
    const nonce = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', rawKey, nonce)

    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
    const authTag = cipher.getAuthTag()

    return Buffer.concat([
        Buffer.from([118, 49, 48]), // v10
        nonce,
        ciphertext,
        authTag,
    ])
}
