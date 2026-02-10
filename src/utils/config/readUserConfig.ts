import { load as yamlLoad } from 'js-yaml';
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import toml from "toml";

import { BaseCommand } from "../../base-commands/BaseCommand.js";
import { ConfigurationFileExtensions, ConfigurationFileParams } from "../../types/ConfigurationFile.js";
import * as LOGGER from "../logging.js";
import { getUserConfigFilePath } from "./getUserConfigFilePath.js";

const require = createRequire(import.meta.url);

/**
 * Find and load a user config file of various formats in the specified directory.
 * Searches for files listed in CONFIG_FILENAMES.
 */
export async function readUserConfig<T extends object>(ctx: BaseCommand, params: ConfigurationFileParams) {
    const configPath = await getUserConfigFilePath(ctx, params);
    if (!configPath) {
        return null;
    }

    try {
        return loadConfig<T>(ctx, configPath);
    }
    catch(error) {
        LOGGER.debug(ctx, `Error loading config file: ${error}.`);
        return null
    }
}

async function loadConfig<T extends object>(ctx: BaseCommand, configPath: string) {
    const ext = path.extname(configPath).slice(1) as ConfigurationFileExtensions;

    switch (ext) {
        case "cjs":
        case "js":
        case "mjs": {
            return loadJsConfig<T>(ctx, configPath);
        }

        case "json": {
            const data = fs.readFileSync(configPath, "utf8");
            return JSON.parse(data) as T;
        }

        case "toml": {
            const data = fs.readFileSync(configPath, "utf8");
            return toml.parse(data) as T;
        }

        case "yaml":
        case "yml": {
            const data = fs.readFileSync(configPath, "utf8");
            return yamlLoad(data) as T;
        }

        default: {
            LOGGER.fatal(ctx, `Unsupported config format found: ${ext satisfies never}. File: ${configPath}`);
        }
    }
}

async function loadJsConfig<T>(ctx: BaseCommand, configPath: string): Promise<null | T> {
    const fileUrl = pathToFileURL(configPath).href;

    // Try ESM
    try {
        const mod = await import(fileUrl);
        return (mod.default ?? mod) as T;
    } catch (esmError) {
        try {
            const mod = require(configPath);
            return mod.default ?? mod;
        } catch (cjsError) {
            LOGGER.fatal(
                ctx,
                `Could not load JS config "${configPath}". Tried ESM and CommonJS.\n` +
                `ESM error: ${esmError}\n` +
                `CJS error: ${cjsError}`
            );

            return null;
        }
    }
}
