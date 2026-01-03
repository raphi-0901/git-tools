import fs from "node:fs";
import path from "node:path";
import terminalLink from "terminal-link";

import { BaseCommand } from "../../base-commands/BaseCommand.js";
import { ConfigurationFileParams } from "../../types/ConfigurationFile.js";
import * as LOGGER from "../logging.js";
import { configFileNames } from "./constants.js";

/**
 * Searches for a user configuration file in a given directory.
 * Tries all supported configuration file names for the current `configId`.
 *
 * @param {BaseCommand} ctx - The command context, providing access to `configId` and logging utilities.
 * @param {ConfigurationFileParams} params - Parameters defining where and how to look for the config file.
 * @param {string} params.rootDir - The directory in which to search for the configuration file.
 *
 * @returns {Promise<string | null>} The full path to the found configuration file, or `null` if none exists.
 *
 * @example
 * const configPath = await getUserConfigFilePath(ctx, { rootDir: process.cwd() });
 * if (!configPath) {
 *   console.log("No configuration file found.");
 * } else {
 *   console.log("Found config file at:", configPath);
 * }
 */
export async function getUserConfigFilePath(ctx: BaseCommand, params: ConfigurationFileParams): Promise<null | string> {
    const possibleConfigFileNames = configFileNames(ctx.configId);

    let configPath: null | string = null;
    for (const fileName of possibleConfigFileNames) {
        const potentialPath = path.join(params.rootDir, fileName);
        if (fs.existsSync(potentialPath)) {
            configPath = potentialPath;
            break;
        }
    }

    if (!configPath) {
        const checkedFileNames = possibleConfigFileNames.map(configFileName => `\t- ${configFileName}`).join("\n");
        LOGGER.debug(ctx, `Could not find a configuration file in directory: ${terminalLink(params.rootDir, `file://${params.rootDir}`)}.\n` +
            `Looked for:\n${checkedFileNames}`
        );

        return null;
    }

    return configPath;
}
