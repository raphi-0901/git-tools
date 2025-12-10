import { Command } from "@oclif/core";
import { deepmerge } from "deepmerge-ts";
import path from "node:path";

import { BaseCommand } from "../../base-commands/BaseCommand.js";
import { getRepositoryRootPath } from "../getRepositoryRootPath.js";
import { readUserConfig } from "./readUserConfig.js";
import { writeUserConfigToFile } from "./writeUserConfigToFile.js";

export async function loadMergedUserConfig<T extends object>(ctx: BaseCommand) {
    const globalConfig = await loadGlobalUserConfig<T>(ctx) || {}
    const localConfig = await loadLocalUserConfig<T>(ctx) || {}

    return deepmerge(globalConfig, localConfig) as T;
}

export async function loadGlobalUserConfig<T extends object>(ctx: BaseCommand) {
    return readUserConfig<T>(ctx, {
        rootDir: await getConfigDirPath(ctx, true),
        type: "global",
    });
}

export async function loadLocalUserConfig<T extends object>(ctx: BaseCommand) {
    return readUserConfig<T>(ctx, {
        rootDir: await getConfigDirPath(ctx, false),
        type: "local",
    });
}

export async function saveGlobalUserConfig<T extends object>(ctx: BaseCommand, data: Partial<T>) {
    const currentGlobalConfig = await loadGlobalUserConfig<Partial<T>>(ctx) || {};
    const mergedConfig = deepmerge(currentGlobalConfig, data) as Partial<T>;

    return writeUserConfigToFile<Partial<T>>(ctx, {
        data: mergedConfig,
        rootDir: await getConfigDirPath(ctx, true),
        type: "global",
    });
}

export async function saveUserConfig<T extends object>(ctx: BaseCommand, global: boolean, data: T) {
    await (global ? saveGlobalUserConfig(ctx, data) : saveLocalUserConfig(ctx, data));
}

export async function saveLocalUserConfig<T extends object>(ctx: BaseCommand, data: T) {
    const currentGlobalConfig = await loadLocalUserConfig<Partial<T>>(ctx) || {};
    const mergedConfig = deepmerge(currentGlobalConfig, data) as Partial<T>;

    return writeUserConfigToFile<Partial<T>>(ctx, {
        data: mergedConfig,
        rootDir: await getConfigDirPath(ctx, false),
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
