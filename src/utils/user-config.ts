import {Command} from "@oclif/core";
import { deepmerge } from "deepmerge-ts";
import fs from "fs-extra";
import os from "node:os";
import path from "node:path";

import { createEmptyConfigFile } from "./create-empty-config-file.js";
import { getRepositoryRootPath } from "./get-repository-root-path.js";

export async function loadUserConfig<T>(commandId: string, ctx: Command): Promise<T> {
    const globalConfig = await loadGlobalUserConfig<T>(commandId, ctx)
    const localConfig = await loadLocalUserConfig<T>(commandId, ctx)

    return deepmerge(globalConfig, localConfig) as T;
}

export async function loadUserConfigForOutput<T extends Record<string, object | string>>(commandId: string, ctx: Command): Promise<T> {
    const globalConfig = await loadGlobalUserConfig<T>(commandId, ctx);
    const localConfig = await loadLocalUserConfig<T>(commandId, ctx);

    const globalWithMarker = Object.fromEntries(
        Object.entries(globalConfig).map(([key, value]) => {
            if(typeof value === "string") {
                return [key, `${value} (global)`]
            }

            const populatedValue = Object.fromEntries(Object.entries(value).map(([subKey, subValue]) => [subKey, `${subValue} (global)`]))

            return [key, populatedValue]
        })
    ) as T;

    return deepmerge(globalWithMarker, localConfig) as T;
}

export async function readConfig<T>(configPath: string, ctx: Command): Promise<T> {
    if (await fs.pathExists(configPath)) {
        try {
            return await fs.readJSON(configPath) as T;
        } catch (error) {
            ctx.warn(`Error reading config: ${error}. Using defaults.`);
            await createEmptyConfigFile(configPath);
        }
    } else {
        ctx.log("Config not found. Creating a new one with defaults.");
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

export async function loadGlobalUserConfig<T>(commandId: string, ctx: Command): Promise<T> {
    return readConfig<T>(await getConfigFilePath(commandId, true), ctx);
}

export async function loadLocalUserConfig<T>(commandId: string, ctx: Command): Promise<T> {
    return readConfig<T>(await getConfigFilePath(commandId), ctx);
}

export async function saveUserConfig<T>(commandId: string, config: Partial<T>, global = false) {
    const configPath = await getConfigFilePath(commandId, global);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}
