import fs from "node:fs";
import path from "node:path";
import terminalLink from "terminal-link";

import { BaseCommand } from "../../base-commands/BaseCommand.js";
import { ConfigurationFileParams } from "../../types/ConfigurationFile.js";
import * as LOGGER from "../logging.js";
import { configFileNames } from "./constants.js";

export async function getUserConfigFilePath(ctx: BaseCommand, params: ConfigurationFileParams) {
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
