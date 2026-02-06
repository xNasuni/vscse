import { createInterface, ReadLine } from 'readline'
import { error, msg, infoblue, nl, fatal } from '../common/log'
import { ARGS, DATA } from '..'
import { VSCDB } from '../../api/vscdb'
import { strerr } from '../common/tools'
import { Result } from '../../api/common/types'

interface Command {
    args?: string[]
    handle: (db: VSCDB, args: string[], rl: ReadLine) => void
}

const exit: Command = {
    handle: (db, _, rl) => {
        db.close()
        rl.close()
        process.exit(0)
    },
}

const help: Command = {
    handle: () => {
        console.log(`\x1b[94mavailable commands`)

        for (const [name, cmd] of commands.entries()) {
            var cmds = ''

            cmds += `  \x1b[38;5;244m${!!cmds ? ', ' : ''}`
            cmds += `\x1b[97m${name}`
            if (cmd.args) {
                for (const arg of cmd.args) {
                    const isOptional = arg.startsWith('(') && arg.endsWith(')')
                    const isRequired = arg.startsWith('<') && arg.endsWith('>')

                    if (isOptional) {
                        cmds += '\x1b[38;5;244m'
                    }
                    if (isRequired) {
                        cmds += '\x1b[38;5;209m'
                    }

                    cmds += ` ${arg}`
                }
            }

            console.log(cmds + '\x1b[0m')
        }
    },
}

export const ls: Command = {
    args: ['(filter_extension_id)'],
    handle: (db, args) => {
        try {
            const secrets = db.computeExtensionSecretsMap()

            if (!secrets) {
                error('no secrets returned from internal function')
                return
            }

            if (secrets.size === 0) {
                infoblue('no secrets found')
                return
            }

            const sortedExtensions = Array.from(secrets.keys()).sort()
            const [filterExtId] = args

            for (const extensionId of sortedExtensions) {
                if (filterExtId && extensionId != filterExtId) {
                    continue
                }

                const isNative = extensionId.startsWith('vscode.')
                const categoryColor = isNative
                    ? '\x1b[38;5;243m'
                    : '\x1b[38;5;75m'
                const keyColor = isNative ? '\x1b[38;5;240m' : '\x1b[38;5;253m'
                const reset = '\x1b[0m'

                console.log(`${categoryColor}${extensionId}${reset}`)

                const entries = secrets
                    .get(extensionId)!
                    .sort((a, b) => a.key.localeCompare(b.key))
                for (const entry of entries) {
                    const valueColor = isNative
                        ? '\x1b[38;5;243m'
                        : entry.status == Result.Error
                          ? '\x1b[91m'
                          : '\x1b[38;5;72m'

                    console.log(
                        `${categoryColor}  ${keyColor}${entry.key}: ${valueColor}${entry.value}${reset}`,
                    )
                }
            }
        } catch (err) {
            error(`failed to list secrets: ${strerr(err)}`)
        }
    },
}

export const rm: Command = {
    args: ['<extension_id>', '<key>'],
    handle: (db, args) => {
        try {
            const [extId, key] = args

            if (!extId) {
                error('no extension id provided')
                return
            }

            if (!key) {
                error('no key provided')
                return
            }

            const secretKey = `secret://${JSON.stringify({ extensionId: extId, key: key })}`
            const secret = db.hasSecret(secretKey)

            if (!secret) {
                error("key doesn't exist")
                return
            }

            db.deleteSecret(secretKey)

            console.log(
                `\x1b[38;5;72mdeleted key ${secretKey} succesfully\x1b[0m`,
            )
        } catch (err) {
            error(`failed to get secret: ${strerr(err)}`)
        }
    },
}

export const get: Command = {
    args: ['<extension_id>', '<key>'],
    handle: (db, args) => {
        try {
            const secrets = db.computeExtensionSecretsMap()

            if (!secrets) {
                error('no secrets returned from internal function')
                return
            }

            if (secrets.size === 0) {
                infoblue('no secrets found')
                return
            }

            const [extId, key] = args

            if (!extId) {
                error('no extension id provided')
                return
            }

            if (!key) {
                error('no key provided')
                return
            }

            const extSecrets = secrets.get(extId)

            if (!extSecrets) {
                error('no keys from that extension')
                return
            }

            const isNative = extId.startsWith('vscode.')

            for (const entry of extSecrets) {
                if (entry.key == key) {
                    const valueColor = isNative
                        ? '\x1b[38;5;243m'
                        : entry.status == Result.Error
                          ? '\x1b[91m'
                          : '\x1b[38;5;72m'

                    console.log(`${valueColor}${entry.value}\x1b[0m`)
                    return
                }
            }

            error('no key from that extension')
        } catch (err) {
            error(`failed to get secret: ${strerr(err)}`)
        }
    },
}

export const set: Command = {
    args: ['<extension_id>', '<key>', '<value>'],
    handle: (db, args) => {
        try {
            const [extId, key, value] = args
            if (!extId) {
                error('no extension id provided')
                return
            }
            if (!key) {
                error('no key provided')
                return
            }
            if (!value) {
                error('no value provided')
                return
            }

            const secretKey = `secret://${JSON.stringify({ extensionId: extId, key: key })}`
            db.storeAndEncryptSecret(secretKey, value)

            console.log(`\x1b[38;5;72mset key ${secretKey} succesfully\x1b[0m`)
        } catch (err) {
            error(`failed to set secret: ${strerr(err)}`)
        }
    },
}

const commands: Map<string, Command> = new Map([
    ['exit', exit],
    ['help', help],
    ['ls', ls],
    ['rm', rm],
    ['get', get],
    ['set', set],
])

export default async function Repl(vscdb: VSCDB) {
    msg('entering repl')
    nl()

    const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '\x1b[38;5;244mvscse> \x1b[0m',
    })

    rl.prompt()

    for await (const line of rl) {
        const trimmed = line.trim()

        if (!trimmed) {
            rl.prompt()
            continue
        }

        const [cmd, ...args] = trimmed.split(/\s+/)
        const command = commands.get(cmd)
        if (!command) {
            error(`unknown command: ${cmd}`)
        } else {
            command.handle(vscdb, args, rl)
        }

        rl.prompt()
    }
}
