export enum Result {
    Okay,
    Error,
}

export interface SecretKey {
    extensionId: string
    key: string
}

export type SecretList = Array<{
    key: string
    status: Result
    value: string
}>

export interface PlatformEncryptionProvider {
    getRawKey(): Uint8Array | null
    decrypt(encryptedBuffer: Buffer): Buffer
    encrypt(plaintext: Buffer): Buffer
}
