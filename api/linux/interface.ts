import { PlatformEncryptionProvider } from '../common/types'
import { getChromiumEncryptionKey } from './keyring'
import crypto from 'crypto'
import { error } from '../../src/common/log'

let cachedRawKey: Uint8Array | null = null

export class LinuxCryptoProvider implements PlatformEncryptionProvider {
    private key: Uint8Array | null

    constructor() {
        this.key = this.getRawKey()
        if (!this.key) {
            throw new Error(
                'Encryption provider could not get keys for encryption',
            )
        }
    }

    getRawKey(): Uint8Array | null {
        if (cachedRawKey) {
            return cachedRawKey
        }

        try {
            cachedRawKey = getChromiumEncryptionKey()
            return cachedRawKey
        } catch (err) {
            error('failed to get chromium encryption key from keyring:', err)
            return null
        }
    }

    decrypt(encryptedBuffer: Buffer): Buffer {
        const version = encryptedBuffer.subarray(0, 3).toString('ascii')
        if (version !== 'v11') {
            throw new Error(`${version} is not a supported encryption version`)
        }

        const iv = Buffer.alloc(16, 0x20)
        const ciphertext = encryptedBuffer.subarray(3)

        const decipher = crypto.createDecipheriv('aes-128-cbc', this.key!, iv)
        decipher.setAutoPadding(true)

        return Buffer.concat([decipher.update(ciphertext), decipher.final()])
    }

    encrypt(plaintext: Buffer): Buffer {
        const iv = Buffer.alloc(16, 0x20)
        const cipher = crypto.createCipheriv('aes-128-cbc', this.key!, iv)

        const ciphertext = Buffer.concat([
            cipher.update(plaintext),
            cipher.final(),
        ])

        return Buffer.concat([
            Buffer.from([118, 49, 49]), // v11
            ciphertext,
        ])
    }
}
