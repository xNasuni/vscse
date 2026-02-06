import { Database } from 'bun:sqlite'
import { decrypt, encrypt, getRawKey } from './encryption'
import { Result, SecretKey, SecretList } from '../src/common/types'
import { strerr } from '../src/common/tools'

export interface SecretEntry {
    key: string
    value: string
}

export class VSCDB {
    private db: Database
    private rawKey: Uint8Array

    constructor(dbPath: string, keyPath: string, readonly: boolean = false) {
        this.db = new Database(dbPath, { readonly, create: !readonly })
        this.rawKey = getRawKey(keyPath)
    }

    getSecretKeys(): string[] {
        const rows = this.db
            .query("SELECT key FROM ItemTable WHERE key LIKE 'secret://%'")
            .all() as { key: string }[]
        return rows.map(row => row.key)
    }

    computeExtensionSecretsMap() {
        const secretKeys = this.getSecretKeys()

        const secrets = new Map<string, SecretList>()

        for (const fullKey of secretKeys) {
            const jsonStr = fullKey.slice('secret://'.length)

            try {
                const parsed = JSON.parse(jsonStr) as SecretKey
                if (!parsed.extensionId || !parsed.key) continue

                const { status, value } = this.fetchAndDecryptSecret(fullKey)

                if (!secrets.has(parsed.extensionId)) {
                    secrets.set(parsed.extensionId, [])
                }

                secrets.get(parsed.extensionId)!.push({
                    key: parsed.key,
                    status,
                    value,
                })
            } catch {
                continue
            }
        }

        return secrets
    }

    fetchAndDecryptSecret(key: string): {
        status: Result
        value: string
    } {
        const row = this.db
            .query('SELECT value FROM ItemTable WHERE key = ?')
            .get(key) as { value: string } | null
        if (!row) {
            return {
                status: Result.Error,
                value: '[Decryption Error: Key not found]',
            }
        }

        try {
            const parsed = JSON.parse(row.value)

            if (parsed.type !== 'Buffer' || !Array.isArray(parsed.data)) {
                return {
                    status: Result.Error,
                    value: `[Decryption Error: ${parsed.type || 'unknown'} is not a supported encoding type]`,
                }
            }

            const encryptedBuffer = Buffer.from(parsed.data)
            const decrypted = decrypt(encryptedBuffer, this.rawKey)

            return {
                status: Result.Okay,
                value: decrypted.toString('utf8'),
            }
        } catch (err) {
            return {
                status: Result.Error,
                value: `[Decryption Error: ${strerr(err)}]`,
            }
        }
    }

    storeAndEncryptSecret(key: string, value: string): void {
        const buffer = Buffer.from(value, 'utf8')
        const encrypted = encrypt(buffer, this.rawKey)
        const json = JSON.stringify({
            type: 'Buffer',
            data: Array.from(encrypted),
        })

        this.db.run(
            'INSERT OR REPLACE INTO ItemTable (key, value) VALUES (?, ?)',
            [key, json],
        )
    }

    hasSecret(key: string): boolean {
        const row = this.db
            .query('SELECT 1 FROM ItemTable WHERE key = ? LIMIT 1')
            .get(key)
        return !!row
    }

    deleteSecret(key: string): boolean {
        const result = this.db.run('DELETE FROM ItemTable WHERE key = ?', [key])
        return result.changes > 0
    }

    close(): void {
        this.db.close()
    }
}
