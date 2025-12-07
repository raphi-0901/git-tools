import { Command } from "@oclif/core";
import fs from "node:fs";
import path from "node:path";
import terminalLink from "terminal-link";

import { ConfigurationFileParams } from "../../types/ConfigurationFile.js";
import * as LOGGER from "../logging.js";
import { globalConfigFileNames, localConfigFileNames } from "./constants.js";

export async function getUserConfigFilePath(ctx: Command, params: ConfigurationFileParams) {
    const configFileNames = params.type === "local" ? localConfigFileNames(params.commandId) : globalConfigFileNames;

    let configPath: null | string = null;
    for (const filename of configFileNames) {
        const potentialPath = path.join(params.rootDir, filename);
        if (fs.existsSync(potentialPath)) {
            configPath = potentialPath;
            break;
        }
    }

    // 2. Error if not found
    if (!configPath) {
        const checkedFileNames = configFileNames.map(configFileName => `\t- ${configFileName}`).join("\n");
        LOGGER.debug(ctx, `Could not find a configuration file in directory: ${terminalLink(params.rootDir, `file://${params.rootDir}`)}.\n` +
            `Looked for:\n${checkedFileNames}`
        );

        return null;
    }

    return configPath;
}
