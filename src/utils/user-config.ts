import { Command } from "@oclif/core";
import { deepmerge } from "deepmerge-ts";
import fs from "fs-extra";
import os from "node:os";
import path from "node:path";

import * as LOGGER from "../utils/logging.js";
import { createEmptyConfigFile } from "./create-empty-config-file.js";
import { getRepositoryRootPath } from "./get-repository-root-path.js";

export async function loadMergedUserConfig<T>(ctx: Command, commandId: string): Promise<T> {
    const globalConfig = await loadGlobalUserConfig<T>(ctx, commandId)
    const localConfig = await loadLocalUserConfig<T>(ctx, commandId)

    return deepmerge(globalConfig, localConfig) as T;
}

export async function readConfig<T>(ctx: Command, configPath: string): Promise<T> {
    if (await fs.pathExists(configPath)) {
        try {
            return await fs.readJSON(configPath) as T;
        } catch (error) {
            LOGGER.fatal(ctx, `Error reading config: ${error}.`);
        }
    } else {
        LOGGER.log(ctx, "Config not found. Creating a new one with defaults.");
        await createEmptyConfigFile(configPath);
    }

    return {} as T;
}

export async function getConfigFilePath(commandId: string, global = false) {
    if (global) {
        const isWin = process.platform === "win32";
        const baseDir = isWin
            ? process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming")
            : process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");

        return path.join(baseDir, commandId, "config.json");
    }

    // local config is repo-specific, so it is the same for all platforms
    const repositoryRootPath = await getRepositoryRootPath();
    return path.join(repositoryRootPath, `.git/${commandId}.config.json`);
}

export async function loadUserConfig<T>(ctx: Command, commandId: string, global: boolean): Promise<T> {
    return readConfig<T>(ctx, await getConfigFilePath(commandId, global));
}

export async function loadGlobalUserConfig<T>(ctx: Command, commandId: string): Promise<T> {
    return readConfig<T>(ctx, await getConfigFilePath(commandId, true));
}

export async function loadLocalUserConfig<T>(ctx: Command, commandId: string): Promise<T> {
    return readConfig<T>(ctx, await getConfigFilePath(commandId));
}

export async function saveUserConfig<T>(commandId: string, config: Partial<T>, global = false) {
    const configPath = await getConfigFilePath(commandId, global);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}
