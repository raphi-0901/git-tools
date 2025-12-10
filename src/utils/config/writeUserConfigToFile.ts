import { dump as yamlDump } from "js-yaml";
import json2toml from 'json2toml';
import fs from "node:fs";
import path from "node:path";
import terminalLink from "terminal-link";

import { BaseCommand } from "../../base-commands/BaseCommand.js";
import {
    ConfigurationFileExtensionRecommendation,
    ConfigurationFileParamsForSave
} from "../../types/ConfigurationFile.js";
import * as LOGGER from "../logging.js";
import { fallbackConfigFileName } from "./constants.js";
import { getUserConfigFilePath } from "./getUserConfigFilePath.js";

export async function writeUserConfigToFile<T extends object>(ctx: BaseCommand, params: ConfigurationFileParamsForSave<T>) {
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

async function writeConfigBasedOnExtension<T extends object>(ctx: BaseCommand, configPath: string, config: T) {
    const dir = path.dirname(configPath);
    fs.mkdirSync(dir, { recursive: true });

    const ext = path.extname(configPath).slice(1) as ConfigurationFileExtensionRecommendation;

    // --- JS (ESM) ---
    if (ext === "js") {
        try {
            const fileContents =
                "// This file was automatically generated\n" +
                "export default " +
                JSON.stringify(config, null, 2) +
                ";\n";

            fs.writeFileSync(configPath, fileContents, "utf8");
            return;
        } catch (error) {
            LOGGER.fatal(ctx, `Could not write JS config "${configPath}": ${error}`);
        }
    }

    // --- JSON ---
    if (ext === "json") {
        const jsonString = JSON.stringify(config, null, 2) + "\n";
        fs.writeFileSync(configPath, jsonString, "utf8");
        return;
    }

    // --- YAML ---
    if (ext === "yaml" || ext === "yml") {
        const yamlString = yamlDump(config, { indent: 2 });
        fs.writeFileSync(configPath, yamlString, "utf8");
        return;
    }

    // --- TOML ---
    if (ext === "toml") {
        // @ltd/j-toml requires specifying the Toml version
        const tomlString = json2toml(config, { indent: 2, newlineAfterSection: true })
        fs.writeFileSync(configPath, tomlString, "utf8");
        return;
    }

    LOGGER.fatal(ctx, `Unsupported config format for saving: ${ext}. File: ${configPath}`);
}

