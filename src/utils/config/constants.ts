/**
 * List of supported configuration file extensions.
 * @type {readonly ["js", "json", "yaml", "yml", "toml", "mjs", "cjs"]}
 */
export const SUPPORTED_CONFIG_EXTENSIONS = ["js", "json", "yaml", "yml", "toml", "mjs", "cjs"] as const;

/**
 * Generates a fallback configuration file name for a given config ID.
 *
 * @param {string} configId - The identifier for the configuration.
 * @returns {`${string}.config.js`} The fallback config file name (JavaScript format).
 *
 * @example
 * fallbackConfigFileName("app"); // "app.config.js"
 */
export function fallbackConfigFileName(configId: string): `${string}.config.js` {
    return `${configId}.config.js` as const;
}

/**
 * Generates all possible configuration file names for a given config ID
 * based on supported extensions.
 *
 * @param {string} configId - The identifier for the configuration.
 * @returns {readonly (`${string}.config.${string}`)[]} An array of possible config file names.
 *
 * @example
 * configFileNames("app");
 * // ["app.config.js", "app.config.json", "app.config.yaml", "app.config.yml", "app.config.toml"]
 */
export function configFileNames (configId: string): readonly (`${string}.config.${typeof SUPPORTED_CONFIG_EXTENSIONS[number]}`)[] {
    return SUPPORTED_CONFIG_EXTENSIONS.map(ext => `${configId}.config.${ext}` as const);
}
