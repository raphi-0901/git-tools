export const SUPPORTED_CONFIG_EXTENSIONS = ["js", "json", "yaml", "yml", "toml"] as const;

export function fallbackConfigFileName(configId: string) {
    return `${configId}.config.js` as const;
}

export function configFileNames (configId: string) {
    return SUPPORTED_CONFIG_EXTENSIONS.map(ext => `${configId}.config.${ext}` as const);
}
