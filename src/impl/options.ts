import { ARGS, DATA } from '..'
import { Result } from '../../api/common/types'
import { isValidFilePath } from '../common/tools'
import { RunType } from '../common/types'

interface OptionDef {
    short: string
    long: string
    args?: string[]
    description: string
}

const optionDefs: OptionDef[] = [
    {
        short: '-d',
        long: '--db',
        args: ['<path>'],
        description: 'force path to vscdb file',
    },
    {
        short: '-k',
        long: '--key',
        args: ['<path>'],
        description: 'force path to local state file',
    },
    {
        short: '-l',
        long: '--list',
        args: ['(filter_extension_id)'],
        description: 'list all secrets',
    },
    {
        short: '-r',
        long: '--rm',
        args: ['<extension_id>', '<key>'],
        description: 'remove a secret',
    },
    {
        short: '-g',
        long: '--get',
        args: ['<extension_id>', '<key>'],
        description: 'fetch and decrypt a secret',
    },
    {
        short: '-s',
        long: '--set',
        args: ['<extension_id>', '<key>', '<value>'],
        description: 'store and encrypt a secret',
    },
    {
        short: '-i',
        long: '--import',
        args: ['<path>'],
        description: 'import secrets from file',
    },
    {
        short: '-e',
        long: '--export',
        args: ['<path>'],
        description: 'export secrets to file',
    },
    { short: '-h', long: '--help', description: 'show this help message' },
]

function printHelp() {
    console.log(`\x1b[94mavailable options`)

    for (const opt of optionDefs) {
        let line = `  \x1b[38;5;244m`
        line += `\x1b[97m${opt.short}/${opt.long}`

        if (opt.args) {
            for (const arg of opt.args) {
                const isOptional = arg.startsWith('(') && arg.endsWith(')')
                const isRequired = arg.startsWith('<') && arg.endsWith('>')

                if (isOptional) {
                    line += '\x1b[38;5;244m'
                }
                if (isRequired) {
                    line += '\x1b[38;5;209m'
                }

                line += ` ${arg}`
            }
        }

        line += `\x1b[38;5;244m - ${opt.description}\x1b[0m`
        console.log(line)
    }

    process.exit(0)
}

export default function Options(): Result {
    const argsIter = ARGS[Symbol.iterator]()
    let current = argsIter.next()

    while (!current.done) {
        const cmd = current.value

        switch (cmd) {
            case '-h':
            case '--help':
                printHelp()
                break
            case '-d':
            case '--db':
                if (DATA.forcedVSCDBFilePath) {
                    DATA.lastError =
                        "ambiguous options; can't set more than one vscdb path"
                    return Result.Error
                }

                current = argsIter.next()
                var pathString = current.value as string
                var isPathValid = isValidFilePath(pathString, true)
                if (current.done || !isPathValid) {
                    DATA.lastError = `expected path after option '${cmd}'`
                    if (pathString && !isPathValid) {
                        DATA.lastError += `, got '${pathString}' (does it exist?)`
                    }

                    return Result.Error
                }

                DATA.forcedVSCDBFilePath = current.value
                break
            case '-k':
            case '--key':
                if (DATA.forcedLocalStateFilePath) {
                    DATA.lastError =
                        "ambiguous options; can't set more than one local state path"
                    return Result.Error
                }

                current = argsIter.next()
                var pathString = current.value as string
                var isPathValid = isValidFilePath(pathString, true)
                if (current.done || !isPathValid) {
                    DATA.lastError = `expected path after option '${cmd}'`
                    if (pathString && !isPathValid) {
                        DATA.lastError += `, got '${pathString}' (does it exist?)`
                    }

                    return Result.Error
                }

                DATA.forcedLocalStateFilePath = current.value
                break
            case '-l':
            case '--list':
                if (DATA.vscseRunType != RunType.Repl) {
                    DATA.lastError =
                        "ambiguous options; can't use more than one runtype"
                    return Result.Error
                }

                current = argsIter.next()
                const listArgs: string[] = []

                if (!current.done && !current.value.startsWith('-')) {
                    listArgs.push(current.value)
                } else {
                    if (!current.done) {
                        current = { done: false, value: current.value }
                    }
                }

                DATA.runArgs = listArgs
                DATA.vscseRunType = RunType.List
                break
            case '-r':
            case '--rm':
                if (DATA.vscseRunType != RunType.Repl) {
                    DATA.lastError =
                        "ambiguous options; can't use more than one runtype"
                    return Result.Error
                }

                const rmArgs: string[] = []

                current = argsIter.next()
                if (current.done || current.value.startsWith('-')) {
                    DATA.lastError = `expected extension_id after option '${cmd}'`
                    return Result.Error
                }
                rmArgs.push(current.value)

                current = argsIter.next()
                if (current.done || current.value.startsWith('-')) {
                    DATA.lastError = `expected key after extension_id`
                    return Result.Error
                }
                rmArgs.push(current.value)

                DATA.runArgs = rmArgs
                DATA.vscseRunType = RunType.Remove
                break
            case '-g':
            case '--get':
                if (DATA.vscseRunType != RunType.Repl) {
                    DATA.lastError =
                        "ambiguous options; can't use more than one runtype"
                    return Result.Error
                }

                const getArgs: string[] = []

                current = argsIter.next()
                if (current.done || current.value.startsWith('-')) {
                    DATA.lastError = `expected extension_id after option '${cmd}'`
                    return Result.Error
                }
                getArgs.push(current.value)

                current = argsIter.next()
                if (current.done || current.value.startsWith('-')) {
                    DATA.lastError = `expected key after extension_id`
                    return Result.Error
                }
                getArgs.push(current.value)

                DATA.runArgs = getArgs
                DATA.vscseRunType = RunType.Get
                break
            case '-s':
            case '--set':
                if (DATA.vscseRunType != RunType.Repl) {
                    DATA.lastError =
                        "ambiguous options; can't use more than one runtype"
                    return Result.Error
                }

                const storeArgs: string[] = []

                current = argsIter.next()
                if (current.done || current.value.startsWith('-')) {
                    DATA.lastError = `expected extension_id after option '${cmd}'`
                    return Result.Error
                }
                storeArgs.push(current.value)

                current = argsIter.next()
                if (current.done || current.value.startsWith('-')) {
                    DATA.lastError = `expected key after extension_id`
                    return Result.Error
                }
                storeArgs.push(current.value)

                current = argsIter.next()
                if (current.done || current.value.startsWith('-')) {
                    DATA.lastError = `expected value after key`
                    return Result.Error
                }
                storeArgs.push(current.value)

                DATA.runArgs = storeArgs
                DATA.vscseRunType = RunType.Set
                break
            case '-i':
            case '--input':
            case '--import':
                if (DATA.vscseRunType != RunType.Repl) {
                    DATA.lastError =
                        "ambiguous options; can't use more than one runtype"
                    return Result.Error
                }

                current = argsIter.next()
                var pathString = current.value as string
                var isPathValid = isValidFilePath(pathString, true)
                if (current.done || !isPathValid) {
                    DATA.lastError = `expected path after option '${cmd}'`
                    if (pathString && !isPathValid) {
                        DATA.lastError += `, got '${pathString}' (does it exist?)`
                    }

                    return Result.Error
                }

                DATA.importFilePath = current.value
                DATA.vscseRunType = RunType.Import
                break
            case '-e':
            case '--export':
                if (DATA.vscseRunType != RunType.Repl) {
                    DATA.lastError =
                        "ambiguous options; can't use more than one runtype"
                    return Result.Error
                }

                current = argsIter.next()
                var pathString = current.value as string
                var isPathValid = isValidFilePath(pathString, false)
                if (current.done || !isPathValid) {
                    DATA.lastError = `expected path after option '${cmd}'`
                    if (pathString && !isPathValid) {
                        DATA.lastError += `, got '${pathString}'`
                    }

                    return Result.Error
                }

                DATA.exportFilePath = current.value
                DATA.vscseRunType = RunType.Export
                break
            default:
                DATA.lastError = `option '${cmd}' unsupported`
                return Result.Error
        }

        current = argsIter.next()
    }

    return Result.Okay
}
