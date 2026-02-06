import { dlopen, FFIType, Pointer, ptr, toArrayBuffer } from 'bun:ffi'

const CRYPTPROTECT_UI_FORBIDDEN = 0x1
const CRYPTPROTECT_LOCAL_MACHINE = 0x4
const BLOB_SIZE = 16

export type DataProtectionScope = 'CurrentUser' | 'LocalMachine'

type Crypt32 = ReturnType<typeof createCrypt32>
type Kernel32 = ReturnType<typeof createKernel32>

function createCrypt32() {
    return dlopen('crypt32.dll', {
        CryptProtectData: {
            args: ['ptr', 'ptr', 'ptr', 'ptr', 'ptr', 'u32', 'ptr'],
            returns: FFIType.i32,
        },
        CryptUnprotectData: {
            args: ['ptr', 'ptr', 'ptr', 'ptr', 'ptr', 'u32', 'ptr'],
            returns: FFIType.i32,
        },
    })
}

function createKernel32() {
    return dlopen('kernel32.dll', {
        LocalFree: {
            args: ['usize'],
            returns: 'ptr',
        },
    })
}

let crypt32: Crypt32 | null = null
let kernel32: Kernel32 | null = null

// lazy load libraries so the generic interface
// doesn't fire specific platform implementations
function ensureLibrariesLoaded() {
    if (!crypt32) {
        crypt32 = createCrypt32()
    }
    if (!kernel32) {
        kernel32 = createKernel32()
    }
}

function getAddress(buffer: Uint8Array): bigint {
    const p = ptr(buffer)

    if (typeof p === 'number' || typeof p === 'bigint') {
        return BigInt(p)
    }

    const pStr = String(p).trim()
    if (pStr.length === 0) return 0n

    return pStr.startsWith('0x') ? BigInt(pStr) : BigInt('0x' + pStr)
}

function createBlob(data: Uint8Array): { blob: Uint8Array; _ref: Uint8Array } {
    const cleanData = data.slice(0)
    const blob = new Uint8Array(BLOB_SIZE)
    const view = new DataView(blob.buffer)

    view.setUint32(0, cleanData.length, true)

    const address = getAddress(cleanData)
    view.setBigUint64(8, address, true)

    return { blob, _ref: cleanData }
}

function readAndFreeBlob(blob: Uint8Array): Uint8Array {
    ensureLibrariesLoaded()

    const view = new DataView(blob.buffer)
    const len = view.getUint32(0, true)
    const address = view.getBigUint64(8, true)

    if (address === 0n || len === 0) return new Uint8Array(0)

    const result = new Uint8Array(
        toArrayBuffer(Number(address) as Pointer, 0, len),
    ).slice(0)

    kernel32!.symbols.LocalFree(Number(address))

    return result
}

export function protectData(
    dataToEncrypt: Uint8Array,
    optionalEntropy: Uint8Array | null = null,
    scope: DataProtectionScope = 'CurrentUser',
): Uint8Array {
    ensureLibrariesLoaded()

    const inData = createBlob(dataToEncrypt)
    const entropyData = optionalEntropy ? createBlob(optionalEntropy) : null

    const outBlob = new Uint8Array(BLOB_SIZE)
    const flags =
        CRYPTPROTECT_UI_FORBIDDEN |
        (scope === 'LocalMachine' ? CRYPTPROTECT_LOCAL_MACHINE : 0)

    try {
        const success = crypt32!.symbols.CryptProtectData(
            ptr(inData.blob),
            0,
            entropyData ? ptr(entropyData.blob) : 0,
            0,
            0,
            flags,
            ptr(outBlob),
        )

        if (!success) throw new Error('CryptProtectData failed')

        return readAndFreeBlob(outBlob)
    } finally {
        const keepAlive = [inData._ref, entropyData?._ref]
        void keepAlive
    }
}

export function unprotectData(
    encryptedData: Uint8Array,
    optionalEntropy: Uint8Array | null = null,
    scope: DataProtectionScope = 'CurrentUser',
): Uint8Array {
    ensureLibrariesLoaded()

    const inData = createBlob(encryptedData)
    const entropyData = optionalEntropy ? createBlob(optionalEntropy) : null

    const outBlob = new Uint8Array(BLOB_SIZE)
    const flags =
        CRYPTPROTECT_UI_FORBIDDEN |
        (scope === 'LocalMachine' ? CRYPTPROTECT_LOCAL_MACHINE : 0)

    try {
        const success = crypt32!.symbols.CryptUnprotectData(
            ptr(inData.blob),
            0,
            entropyData ? ptr(entropyData.blob) : 0,
            0,
            0,
            flags,
            ptr(outBlob),
        )

        if (!success) throw new Error('CryptUnprotectData failed')

        return readAndFreeBlob(outBlob)
    } finally {
        const keepAlive = [inData._ref, entropyData?._ref]
        void keepAlive
    }
}
