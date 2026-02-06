export const PREFIX = '[vscse '

export function fatal(...msg: any[]): never {
    console.error(
        `\x1b[91m\x1b[107m${PREFIX}bad]\x1b[91m\x1b[49m ${msg.join(' ')}\x1b[0m`,
    )
    process.exit(1)
}

export function error(...msg: any[]) {
    console.error(
        `\x1b[91m\x1b[49m${PREFIX}err]\x1b[91m ${msg.join(' ')}\x1b[0m`,
    )
}

export function msg(...msg: any[]) {
    console.log(`\x1b[38;5;244m\x1b[49m${PREFIX}msg] ${msg.join(' ')}\x1b[0m`)
}

export function infogreen(...msg: any[]) {
    console.log(`\x1b[92m\x1b[49m${PREFIX}inf] ${msg.join(' ')}\x1b[0m`)
}

export function infoblue(...msg: any[]) {
    console.log(`\x1b[94m\x1b[49m${PREFIX}inf] ${msg.join(' ')}\x1b[0m`)
}

export function nl() {
    console.log('')
}
