import Options from './impl/options'
import Find from './impl/find'
import Repl, { get, ls, rm, set } from './impl/repl'
import { error, fatal, infoblue, infogreen } from './common/log'
import { MainDataStruct, Result, RunType } from './common/types'
import { strerr, validateLocalState, validateSQLite } from './common/tools'
import { VSCDB } from '../api/vscdb'
import exportSecrets from './impl/export'
import importSecrets from './impl/import'

export const PLATFORM = process.platform
export const ARCH = process.arch
export const ARGS = process.argv.slice(2)
export const DATA: MainDataStruct = {
    vscseRunType: RunType.Repl,
}

const SUPPORTED_PLATFORMS: NodeJS.Platform[] = ['win32'] // todo(xNasuni): support for "linux", "darwin"

async function main() {
    if (!SUPPORTED_PLATFORMS.includes(PLATFORM as NodeJS.Platform)) {
        fatal(
            `platform "${PLATFORM}" is unsupported. needs ${JSON.stringify(SUPPORTED_PLATFORMS)}`,
        )
    }

    if (Options() != Result.Okay) {
        fatal(`options parsing failed: ${DATA.lastError}`)
    }

    if (
        (await Find()) != Result.Okay &&
        !DATA.forcedVSCDBFilePath &&
        !DATA.forcedLocalStateFilePath
    ) {
        fatal(
            `couldn't automatically find vscdb or local state file path: ${DATA.lastError}`,
        )
    }

    if (DATA.forcedVSCDBFilePath) {
        if (!validateSQLite(DATA.forcedVSCDBFilePath)) {
            fatal(
                `couldn't use forced vscdb file: file is not a valid vscdb SQLite database or cannot be read`,
            )
        }

        infoblue('forcing vscdb file path')
    } else {
        infogreen('found vscdb file path')
    }

    if (DATA.forcedLocalStateFilePath) {
        if (!validateLocalState(DATA.forcedLocalStateFilePath)) {
            fatal(
                `couldn't use forced local state file: file is not a valid local state json file or cannot be read`,
            )
        }

        infoblue('forcing local state file path')
    } else {
        infogreen('found local state file path')
    }

    const dbPath = DATA.forcedVSCDBFilePath || DATA.foundVSCDBFilePath
    if (!dbPath) {
        error('no vscdb path available')
        return
    }
    const keyPath =
        DATA.forcedLocalStateFilePath || DATA.foundLocalStateFilePath
    if (!keyPath) {
        error('no local state path available')
        return
    }

    var vscdb

    try {
        vscdb = new VSCDB(dbPath, keyPath, false)
    } catch (err) {
        fatal(
            `database failed to mount rw: ${strerr(err)} (visual studio code shouldn't be open)`,
        )
    }

    switch (DATA.vscseRunType) {
        case RunType.Repl:
            Repl(vscdb)
            break
        case RunType.List:
            ls.handle(vscdb, DATA.runArgs || [], null as any)
            break
        case RunType.Remove:
            rm.handle(vscdb, DATA.runArgs || [], null as any)
            break
        case RunType.Get:
            get.handle(vscdb, DATA.runArgs || [], null as any)
            break
        case RunType.Set:
            set.handle(vscdb, DATA.runArgs || [], null as any)
            break
        case RunType.Import:
            importSecrets(vscdb, DATA.importFilePath!)
            break
        case RunType.Export:
            exportSecrets(vscdb, DATA.exportFilePath!)
            break
        default:
            fatal(`unimplemented runtype ${DATA.vscseRunType}`)
    }
}

main().catch(err => fatal(strerr(err)))
