import { writeFileSync } from 'fs'
import { VSCDB } from '../../api/vscdb'
import { error, infoblue } from '../common/log'
import { strerr } from '../common/tools'
import { Result } from '../../api/common/types'

type ExtensionId = string
type Key = string
type Value = string

function exportWrite(exportPath: string, data: object): Result {
    try {
        writeFileSync(
            exportPath,
            JSON.stringify({ vscse: true, vscsemdb: data }),
        )

        return Result.Okay
    } catch (err) {
        error(`failed to export secrets: ${strerr(err)}`)
        return Result.Error
    }
}

export default function exportSecrets(db: VSCDB, exportPath: string): Result {
    const secrets = db.computeExtensionSecretsMap()

    if (!secrets) {
        exportWrite(exportPath, {})
        return Result.Okay
    }

    if (secrets.size === 0) {
        exportWrite(exportPath, {})
        return Result.Okay
    }

    const exportData: Record<ExtensionId, Record<Key, Value>> = {}
    var errorCount = 0
    var successCount = 0

    for (const [extId, rawpairs] of secrets.entries()) {
        const keys: Record<Key, Value> = {}
        for (const pair of rawpairs) {
            if (pair.status == Result.Error) {
                errorCount++
                error(
                    `failed to export secret://${JSON.stringify({ extensionId: extId, key: pair.key })}: ${pair.value}`,
                )
                continue
            }

            keys[pair.key] = pair.value
            successCount++
        }

        exportData[extId] = keys
    }

    const result = exportWrite(exportPath, exportData)
    if (result == Result.Error) {
        return Result.Error
    }

    const successMsg = `exported with ${successCount} secret${successCount === 1 ? '' : 's'}`
    if (errorCount >= 1) {
        const errorMsg = ` and skipped ${errorCount} broken secret${errorCount === 1 ? '' : 's'}`
        infoblue(successMsg + `\x1b[91m${errorMsg}`)
    } else {
        infoblue(successMsg)
    }

    return Result.Okay
}
