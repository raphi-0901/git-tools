export const SUPPORTED_CONFIG_EXTENSIONS = ["js", "json", "yaml", "yml", "toml"] as const;

export function fallbackConfigFileName(commandId: string) {
    return `${commandId}.config.js` as const;
}

export function configFileNames (commandId: string) {
    return SUPPORTED_CONFIG_EXTENSIONS.map(ext => `${commandId}.config.${ext}` as const);
}
