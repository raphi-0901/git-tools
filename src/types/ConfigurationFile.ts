import { SUPPORTED_CONFIG_EXTENSIONS } from "../utils/config/constants.js";

export type ConfigurationFileExtensions = typeof SUPPORTED_CONFIG_EXTENSIONS[number];

export type ConfigurationFileParams = {
    rootDir: string,
    type: "global" | "local",
}
export type ConfigurationFileParamsForSave<T> = ConfigurationFileParams & { data: T }
