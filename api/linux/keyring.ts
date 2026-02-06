import { dlopen, FFIType, ptr, CString } from 'bun:ffi'
import { pbkdf2Sync } from 'crypto'

const SECRET_SCHEMA_NONE = 0
const SECRET_SCHEMA_ATTRIBUTE_STRING = 0

type Libsecret = ReturnType<typeof createLibsecret>

function createLibsecret() {
    return dlopen('libsecret-1.so.0', {
        secret_password_lookup_sync: {
            args: [
                FFIType.ptr,
                FFIType.ptr,
                FFIType.ptr,
                FFIType.cstring,
                FFIType.cstring,
                FFIType.ptr,
            ],
            returns: FFIType.ptr,
        },
        secret_schema_new: {
            args: [
                FFIType.cstring,
                FFIType.i32,
                FFIType.cstring,
                FFIType.i32,
                FFIType.ptr,
            ],
            returns: FFIType.ptr,
        },
        secret_schema_unref: {
            args: [FFIType.ptr],
            returns: FFIType.void,
        },
        g_free: {
            args: [FFIType.ptr],
            returns: FFIType.void,
        },
    })
}

let libsecret: Libsecret | null = null

// lazy load libraries so the generic interface
// doesn't fire specific platform implementations
function ensureLibraryLoaded() {
    if (!libsecret) {
        libsecret = createLibsecret()
    }
}

export function getKeyringPassword(
    schemaName: string,
    application: string,
): string {
    ensureLibraryLoaded()

    const schemaNameBuf = Buffer.from(`${schemaName}\0`)
    const attrName = Buffer.from('application\0')

    const schema = libsecret!.symbols.secret_schema_new(
        ptr(schemaNameBuf),
        SECRET_SCHEMA_NONE,
        ptr(attrName),
        SECRET_SCHEMA_ATTRIBUTE_STRING,
        null,
    )

    if (!schema || schema === 0) {
        throw new Error('Failed to create secret schema')
    }

    try {
        const appName = Buffer.from(`${application}\0`)
        const attrNameBuf = Buffer.from('application\0')

        const passwordPtr = libsecret!.symbols.secret_password_lookup_sync(
            schema,
            null,
            null,
            ptr(attrNameBuf),
            ptr(appName),
            null,
        )

        if (!passwordPtr || passwordPtr === 0) {
            throw new Error(
                `Password not found in keyring for application: ${application}`,
            )
        }

        const cstr = new CString(passwordPtr)
        const password = cstr.toString()

        libsecret!.symbols.g_free(passwordPtr)

        return password
    } finally {
        libsecret!.symbols.secret_schema_unref(schema)
    }
}

export function getChromiumKeyringPassword(): string {
    const schemaName = 'chrome_libsecret_os_crypt_password_v2'
    const apps = ['Code', 'chrome', 'chromium', 'vscode', 'code']

    for (const app of apps) {
        try {
            return getKeyringPassword(schemaName, app)
        } catch {
            continue
        }
    }

    throw new Error(
        'Chromium password not found in keyring for any known application',
    )
}

export function deriveChromiumKey(password: string): Uint8Array {
    const salt = Buffer.from('saltysalt')
    return pbkdf2Sync(password, salt, 1, 16, 'sha1')
}

export function getChromiumEncryptionKey(): Uint8Array {
    const password = getChromiumKeyringPassword()
    return deriveChromiumKey(password)
}
