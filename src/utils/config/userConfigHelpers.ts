import { Command } from "@oclif/core";
import { deepmerge } from "deepmerge-ts";
import os from "node:os";
import path from "node:path";

import { getRepositoryRootPath } from "../get-repository-root-path.js";
import { readUserConfig } from "./readUserConfig.js";
import { writeUserConfigToFile } from "./writeUserConfigToFile.js";

export async function loadMergedUserConfig<T extends object>(ctx: Command, commandId: string) {
    const globalConfig = await loadGlobalUserConfig<T>(ctx, commandId) || {}
    const localConfig = await loadLocalUserConfig<T>(ctx, commandId) || {}

    return deepmerge(globalConfig, localConfig) as T;
}

export async function loadGlobalUserConfig<T extends object>(ctx: Command, commandId: string) {
    return readUserConfig<T>(ctx, {
        rootDir: await getConfigDirPath(commandId, true),
        type: "global",
    });
}

export async function loadLocalUserConfig<T extends object>(ctx: Command, commandId: string) {
    return readUserConfig<T>(ctx, {
        commandId,
        rootDir: await getConfigDirPath(commandId),
        type: "local",
    });
}

export async function saveGlobalUserConfig<T extends object>(ctx: Command, commandId: string, data: Partial<T>) {
    const currentGlobalConfig = await loadGlobalUserConfig<Partial<T>>(ctx, commandId) || {};
    const mergedConfig = deepmerge(currentGlobalConfig, data) as Partial<T>;

    return writeUserConfigToFile<Partial<T>>(ctx, {
        data: mergedConfig,
        rootDir: await getConfigDirPath(commandId, true),
        type: "global",
    });
}

export async function saveUserConfig<T extends object>(ctx: Command, commandId: string, global: boolean, data: T) {
    await (global ? saveGlobalUserConfig(ctx, commandId, data) : saveLocalUserConfig(ctx, commandId, data));
}

export async function saveLocalUserConfig<T extends object>(ctx: Command, commandId: string, data: T) {
    const currentGlobalConfig = await loadLocalUserConfig<Partial<T>>(ctx, commandId) || {};
    const mergedConfig = deepmerge(currentGlobalConfig, data) as Partial<T>;

    return writeUserConfigToFile<Partial<T>>(ctx, {
        commandId,
        data: mergedConfig,
        rootDir: await getConfigDirPath(commandId),
        type: "local",
    });
}

export async function getConfigDirPath(commandId: string, global = false) {
    if (global) {
        const isWin = process.platform === "win32";
        const baseDir = isWin
            ? process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming")
            : process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");

        return path.join(baseDir, commandId);
    }

    // local config is repo-specific, so it is the same for all platforms
    const repositoryRootPath = await getRepositoryRootPath();
    return path.join(repositoryRootPath, `.git`);
}
