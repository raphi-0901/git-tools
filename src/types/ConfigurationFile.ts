import { SUPPORTED_CONFIG_EXTENSIONS } from "../utils/constants.js";

// eslint-disable-next-line perfectionist/sort-union-types
export type ConfigurationFileExtensionRecommendation = typeof SUPPORTED_CONFIG_EXTENSIONS[number] | (string & {});
export type ConfigurationFileParams = {
    commandId: string,
    rootDir: string,
    type: "local",
} | {
    rootDir: string,
    type: "global",
}
export type ConfigurationFileParamsForSave<T> = ConfigurationFileParams & { data: T }
