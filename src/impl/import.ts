import { readFileSync, writeFileSync } from 'fs'
import { VSCDB } from '../../api/vscdb'
import { error, infoblue, infogreen } from '../common/log'
import { strerr } from '../common/tools'
import { Result } from '../../api/common/types'

type ExtensionId = string
type Key = string
type Value = string

function importRead(importPath: string) {
    try {
        const dataStr = readFileSync(importPath).toString('utf-8')

        if (!dataStr) {
            error(`failed to import secrets: no data in import path`)
            return null
        }

        const data = JSON.parse(dataStr)

        if (!data.vscse || !data.vscsemdb) {
            error(
                `failed to import secrets: invalid data in imported file (missing vscse or vscsemdb)`,
            )
            return null
        }

        const vscsemdb = data.vscsemdb
        if (typeof vscsemdb !== 'object' || vscsemdb === null) {
            error('failed to import secrets: vscsemdb is not an object')
            return null
        }

        for (const extId in vscsemdb) {
            if (
                typeof vscsemdb[extId] !== 'object' ||
                vscsemdb[extId] === null
            ) {
                error(
                    `failed to import secrets: extension '${extId}' does not contain valid key-value pairs`,
                )
                return null
            }
        }

        return data.vscsemdb
    } catch (err) {
        error(`failed to export secrets: ${strerr(err)}`)
        return null
    }
}

export default function importSecrets(db: VSCDB, importPath: string): Result {
    const data: Record<ExtensionId, Record<Key, Value>> = importRead(importPath)
    if (!data) {
        return Result.Error
    }

    var errorCount = 0
    var successCount = 0

    for (const extId in data) {
        const rawpairs = data[extId]

        for (const key in rawpairs) {
            const value = rawpairs[key]
            const secretKey = `secret://${JSON.stringify({ extensionId: extId, key: key })}`

            try {
                db.storeAndEncryptSecret(secretKey, value)
                successCount++
            } catch (err) {
                errorCount++
                error(`failed to import ${secretKey}: ${err}`)
            }
        }
    }

    const successMsg = `imported ${successCount} secret${successCount === 1 ? '' : 's'}`
    if (errorCount >= 1) {
        const errorMsg = ` but failed to import ${errorCount} broken secret${errorCount === 1 ? '' : 's'}`
        infoblue(successMsg + `\x1b[91m${errorMsg}`)
    } else {
        infoblue(successMsg)
    }

    return Result.Okay
}
