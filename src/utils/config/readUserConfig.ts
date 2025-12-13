import { Command } from "@oclif/core";
import { load as yamlLoad } from 'js-yaml';
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import toml from "toml";

import { BaseCommand } from "../../base-commands/BaseCommand.js";
import { ConfigurationFileExtensionRecommendation, ConfigurationFileParams } from "../../types/ConfigurationFile.js";
import * as LOGGER from "../logging.js";
import { getUserConfigFilePath } from "./getUserConfigFilePath.js";

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
    const ext = path.extname(configPath).slice(1) as ConfigurationFileExtensionRecommendation;

    if (ext === "js") {
        try {
            // Try ESM import
            const mod = await import(pathToFileURL(configPath).href);
            return (mod.default ?? mod) as T;
        } catch (error) {
            LOGGER.fatal(ctx, `Could not load JS config "${configPath}": ${error}`);
        }
    }

    // --- JSON ---
    if (ext === "json") {
        const data = fs.readFileSync(configPath, "utf8");
        return JSON.parse(data) as T;
    }

    // --- YAML ---
    if (ext === "yaml" || ext === "yml") {
        const data = fs.readFileSync(configPath, "utf8");
        return yamlLoad(data) as T;
    }

    // --- TOML ---
    if (ext === "toml") {
        const data = fs.readFileSync(configPath, "utf8");
        return toml.parse(data) as T;
    }

    // This case should be unreachable if CONFIG_FILENAMES is correctly derived from SUPPORTED_EXTENSIONS
    LOGGER.fatal(ctx, `Unsupported config format found: ${ext}. File: ${configPath}`);
}
