import { SUPPORTED_CONFIG_EXTENSIONS } from '../utils/config/constants.js'

// eslint-disable-next-line perfectionist/sort-union-types
export type ConfigurationFileExtensionRecommendation = typeof SUPPORTED_CONFIG_EXTENSIONS[number] | (string & {});
export type ConfigurationFileParams = {
    rootDir: string,
    type: 'global' | 'local',
}
export type ConfigurationFileParamsForSave<T> = ConfigurationFileParams & { data: T }
