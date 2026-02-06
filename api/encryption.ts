import { PlatformEncryptionProvider } from './common/types'
import { LinuxCryptoProvider } from './linux/interface'
import { WindowsCryptoProvider } from './win/interface'

const NO_ENC = () => null

const ENCRYPTION_PROVIDERS: Record<
    NodeJS.Platform,
    () => PlatformEncryptionProvider | null
> = {
    win32: () => new WindowsCryptoProvider(),
    linux: () => new LinuxCryptoProvider(),
    darwin: NO_ENC,
    aix: NO_ENC,
    android: NO_ENC,
    freebsd: NO_ENC,
    haiku: NO_ENC,
    openbsd: NO_ENC,
    sunos: NO_ENC,
    cygwin: NO_ENC,
    netbsd: NO_ENC,
}

export function getPlatformEncryptionProvider(): PlatformEncryptionProvider {
    const getProvider = ENCRYPTION_PROVIDERS[process.platform]
    const provider = getProvider?.()

    if (!provider) {
        throw new Error(
            `Encryption not yet implemented for platform: ${process.platform}`,
        )
    }

    return provider
}
