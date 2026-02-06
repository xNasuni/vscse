import { readFileSync } from 'fs'
import { PlatformEncryptionProvider } from '../common/types'
import { unprotectData } from './dpapi'
import crypto from 'crypto'
import { DATA } from '../../src'
import { error } from '../../src/common/log'
import { validateLocalState } from '../../src/common/tools'

export class WindowsCryptoProvider implements PlatformEncryptionProvider {
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
        if (this.key) {
            return this.key
        }

        const keyPath =
            DATA.forcedLocalStateFilePath ?? DATA.foundLocalStateFilePath
        if (!keyPath) {
            error('no local state path')
            return null
        }

        if (!validateLocalState(keyPath)) {
            error('invalid local state path')
            return null
        }

        const localStateKeyBase64 = JSON.parse(
            readFileSync(keyPath).toString('ascii'),
        ).os_crypt.encrypted_key

        const encryptedKey = Buffer.from(
            localStateKeyBase64,
            'base64',
        ).subarray(5)

        this.key = unprotectData(encryptedKey, null, 'CurrentUser')
        return this.key
    }

    decrypt(encryptedBuffer: Buffer): Buffer {
        const version = encryptedBuffer.subarray(0, 3).toString('ascii')
        if (version !== 'v10') {
            throw new Error(`${version} is not a supported encryption version`)
        }

        const nonce = encryptedBuffer.subarray(3, 15)
        const ciphertext = encryptedBuffer.subarray(
            15,
            encryptedBuffer.length - 16,
        )
        const authTag = encryptedBuffer.subarray(encryptedBuffer.length - 16)

        const decipher = crypto.createDecipheriv(
            'aes-256-gcm',
            this.key!,
            nonce,
        )
        decipher.setAuthTag(authTag)

        return Buffer.concat([decipher.update(ciphertext), decipher.final()])
    }

    encrypt(plaintext: Buffer): Buffer {
        const nonce = crypto.randomBytes(12)
        const cipher = crypto.createCipheriv('aes-256-gcm', this.key!, nonce)

        const ciphertext = Buffer.concat([
            cipher.update(plaintext),
            cipher.final(),
        ])
        const authTag = cipher.getAuthTag()

        return Buffer.concat([
            Buffer.from([118, 49, 48]), // v10
            nonce,
            ciphertext,
            authTag,
        ])
    }
}
