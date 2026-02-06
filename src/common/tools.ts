import { accessSync, constants, readFileSync } from 'fs'
import * as path from 'path'
import { Database } from 'bun:sqlite'
import { DATA } from '..'

export function strerr(err: any) {
    return err instanceof Error ? err.message + '\n' + err.stack : String(err)
}

export function isValidFilePath(p: string, checkExistence?: boolean): boolean {
    if (!p || typeof p !== 'string') return false

    if (p.startsWith('-')) return false

    try {
        const abs = path.resolve(p)

        if (checkExistence) {
            accessSync(abs, constants.F_OK)
        }

        return true
    } catch {
        return false
    }
}

export function validateSQLite(dbPath: string): boolean {
    try {
        accessSync(dbPath, constants.R_OK)

        const db = new Database(dbPath, { readonly: true })

        const tableCheck = db
            .query(
                `
			SELECT name FROM sqlite_master 
			WHERE type='table' AND name='ItemTable'
		`,
            )
            .all() as any[]

        if (tableCheck.length === 0) {
            db.close()
            return false
        }

        const schema = db.query('PRAGMA table_info(ItemTable)').all() as any[]
        db.close()

        const hasKey = schema.some(col => col.name === 'key')
        const hasValue = schema.some(col => col.name === 'value')

        return hasKey && hasValue
    } catch (err) {
        DATA.lastError = strerr(err)
        return false
    }
}

export function validateLocalState(keyPath: string): boolean {
    try {
        accessSync(keyPath, constants.R_OK)

        const data = JSON.parse(readFileSync(keyPath).toString('ascii'))
        const oscrypt = data.os_crypt

        if (!oscrypt) {
            DATA.lastError = 'no os_crypt key in json'
            return false
        }

        const keyb64 = oscrypt.encrypted_key
        const key = atob(keyb64)

        if (!key || key.length <= 0) {
            DATA.lastError = 'no encrypted_key key in os_crypt object'
            return false
        }

        return true
    } catch (err) {
        DATA.lastError = strerr(err)
        return false
    }
}
