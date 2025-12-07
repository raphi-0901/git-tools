import { SUPPORTED_CONFIG_EXTENSIONS } from "../constants.js";

export const globalConfigFileNameBackup = "config.js" as const;
export function localConfigFileNameBackup(commandId: string) {
    return `${commandId}.config.js` as const;
}

export const globalConfigFileNames = SUPPORTED_CONFIG_EXTENSIONS.map(ext => `config.${ext}` as const);
export function localConfigFileNames (commandId: string) {
    return SUPPORTED_CONFIG_EXTENSIONS.map(ext => `${commandId}.config.${ext}` as const);
}
