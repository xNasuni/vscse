import { homedir } from 'os'
import { join } from 'path'
import { existsSync } from 'fs'
import { DATA } from '..'
import { validateLocalState, validateSQLite } from '../common/tools'
import { Result } from '../../api/common/types'

const NO_PATH = () => ''
const VSCDB_PATHS: Record<NodeJS.Platform, () => string> = {
    win32: () =>
        process.env.APPDATA
            ? join(
                  process.env.APPDATA,
                  'Code',
                  'User',
                  'globalStorage',
                  'state.vscdb',
              )
            : '',
    linux: () =>
        join(
            homedir(),
            '.config',
            'Code',
            'User',
            'globalStorage',
            'state.vscdb',
        ),
    darwin: () =>
        join(
            homedir(),
            'Library',
            'Application Support',
            'Code',
            'User',
            'globalStorage',
            'state.vscdb',
        ),
    aix: NO_PATH,
    android: NO_PATH,
    freebsd: NO_PATH,
    haiku: NO_PATH,
    openbsd: NO_PATH,
    sunos: NO_PATH,
    cygwin: NO_PATH,
    netbsd: NO_PATH,
}
const LOCAL_STATE_PATHS: Record<NodeJS.Platform, () => string> = {
    win32: () =>
        process.env.APPDATA
            ? join(process.env.APPDATA, 'Code', 'Local State')
            : '',
    linux: NO_PATH,
    darwin: NO_PATH,
    aix: NO_PATH,
    android: NO_PATH,
    freebsd: NO_PATH,
    haiku: NO_PATH,
    openbsd: NO_PATH,
    sunos: NO_PATH,
    cygwin: NO_PATH,
    netbsd: NO_PATH,
}

export default async function Find(): Promise<Result> {
    const getVscdbPath = VSCDB_PATHS[process.platform]
    const getLocalStatePath = LOCAL_STATE_PATHS[process.platform]

    const vscdbPath = getVscdbPath?.()
    const localStatePath = getLocalStatePath?.()

    if (!vscdbPath) {
        DATA.lastError = "platform doesn't have vscdb path set"
        return Result.Error
    }

    if (!existsSync(vscdbPath)) {
        DATA.lastError = "platform vscdb file doesn't exist"
        return Result.Error
    }

    if (!validateSQLite(vscdbPath)) {
        DATA.lastError =
            'platform vscdb file is not a valid vscdb SQLite database or cannot be read'
        return Result.Error
    }

    if (localStatePath) {
        if (!existsSync(localStatePath)) {
            DATA.lastError = "platform local state file doesn't exist"
            return Result.Error
        }

        if (!validateLocalState(localStatePath)) {
            DATA.lastError =
                'platform local state file is not a valid local state json file or cannot be read'
            return Result.Error
        }

        DATA.foundLocalStateFilePath = localStatePath
    }

    DATA.foundVSCDBFilePath = vscdbPath
    return Result.Okay
}
