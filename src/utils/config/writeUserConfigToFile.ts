import { dump as yamlDump, load as yamlLoad } from "js-yaml";
import json2toml from 'json2toml';
import fs from "node:fs";
import path from "node:path";
import terminalLink from "terminal-link";
import toml from "toml";

import { BaseCommand } from "../../base-commands/BaseCommand.js";
import {
    ConfigurationFileExtensions,
    ConfigurationFileParamsForSave
} from "../../types/ConfigurationFile.js";
import * as LOGGER from "../logging.js";
import { fallbackConfigFileName } from "./constants.js";
import { getUserConfigFilePath } from "./getUserConfigFilePath.js";

/**
 * Writes a user configuration object to a file.
 * If a configuration file already exists, it will be overwritten.
 * If none exists, a fallback file name is used in the specified directory.
 *
 * @template T - The shape of the configuration object.
 * @param {BaseCommand} ctx - The command context, used for logging.
 * @param {ConfigurationFileParamsForSave<T>} params - Parameters for saving the configuration.
 * @param {string} params.rootDir - Directory to save the config file in.
 * @param {T} params.data - The configuration object to save.
 *
 * @returns {Promise<void>} Resolves when the configuration has been successfully written.
 *
 * @example
 * await writeUserConfigToFile<MyConfigType>(ctx, {
 *   rootDir: process.cwd(),
 *   data: { theme: "dark", timeout: 5000 }
 * });
 */
export async function writeUserConfigToFile<T extends object>(
    ctx: BaseCommand,
    params: ConfigurationFileParamsForSave<T>
): Promise<void> {
    const configPath = await getUserConfigFilePath(ctx, params);
    if (!configPath) {
        const fileNameFallback = fallbackConfigFileName(ctx.configId);
        const fallbackPath = path.join(params.rootDir, fileNameFallback);
        LOGGER.debug(ctx, `There is currently no config file. Storing it in ${terminalLink(fallbackPath, `file://${fallbackPath}`)}`);

        await writeConfigBasedOnExtension(ctx, fallbackPath, params.data)
        return;
    }

    await writeConfigBasedOnExtension<T>(ctx, configPath, params.data);
}

/**
 * Writes a configuration object to a file, automatically handling the format
 * based on the file extension.
 *
 * Supported extensions:
 * - `.js` -> JavaScript module exporting the object
 * - `.json` -> JSON file
 * - `.yaml` / `.yml` -> YAML file
 * - `.toml` -> TOML file
 *
 * @template T - The shape of the configuration object.
 * @param {BaseCommand} ctx - The command context, used for logging fatal errors.
 * @param {string} configPath - Full path to the file to write.
 * @param {T} config - The configuration object to write.
 *
 * @returns {Promise<void>} Resolves after writing the file. Throws/logs fatal errors on unsupported formats.
 *
 * @internal
 */
async function writeConfigBasedOnExtension<T extends object>(
    ctx: BaseCommand,
    configPath: string,
    config: T
): Promise<void> {
    const dir = path.dirname(configPath);

    try {
        fs.mkdirSync(dir, { recursive: true });

        const ext = path.extname(configPath).slice(1) as ConfigurationFileExtensions;

        switch (ext) {
            case "cjs":
            case "js": {
                const fileContents =
                    "// This file was automatically generated\n" +
                    "module.exports = " +
                    JSON.stringify(config, null, 2) +
                    ";\n";

                fs.writeFileSync(configPath, fileContents, "utf8");
                return;
            }

            case "json": {
                const jsonString = JSON.stringify(config, null, 2) + "\n";
                fs.writeFileSync(configPath, jsonString, "utf8");
                return;
            }

            case "mjs": {
                const fileContents =
                    "// This file was automatically generated\n" +
                    "export default " +
                    JSON.stringify(config, null, 2) +
                    ";\n";

                fs.writeFileSync(configPath, fileContents, "utf8");
                return;
            }

            case "toml": {
                const tomlString = json2toml(config, { indent: 2, newlineAfterSection: true });
                fs.writeFileSync(configPath, tomlString, "utf8");
                return;
            }

            case "yaml":
            case "yml": {
                const yamlString = yamlDump(config, { indent: 2 });
                fs.writeFileSync(configPath, yamlString, "utf8");
                return;
            }

            default: {
                LOGGER.fatal(ctx, `Unsupported config format for saving: ${ext satisfies never}. File: ${configPath}`);

            }
        }
    } catch (error) {
        LOGGER.fatal(ctx, `Could not write config "${configPath}": ${error}`);
    }
}
