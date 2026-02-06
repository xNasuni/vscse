export interface MainDataStruct {
    vscseRunType: RunType
    runArgs?: string[]
    lastError?: string
    foundLocalStateFilePath?: string
    forcedLocalStateFilePath?: string
    foundVSCDBFilePath?: string
    forcedVSCDBFilePath?: string
    importFilePath?: string
    exportFilePath?: string
    localStateKey?: string
}

export enum RunType {
    Repl,
    List,
    Remove,
    Get,
    Set,
    Import,
    Export,
}
