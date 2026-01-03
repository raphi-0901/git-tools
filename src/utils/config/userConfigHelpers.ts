import { Command } from "@oclif/core";
import { deepmerge } from "deepmerge-ts";
import path from "node:path";

import { BaseCommand } from "../../base-commands/BaseCommand.js";
import { getRepositoryRootPath } from "../getRepositoryRootPath.js";
import { readUserConfig } from "./readUserConfig.js";
import { writeUserConfigToFile } from "./writeUserConfigToFile.js";

/**
 * Loads and merges the global and local user configuration.
 *
 * @template T - The shape of the configuration object.
 * @param {BaseCommand} ctx - The command context.
 * @returns {Promise<T>} The merged configuration object, with local config taking precedence.
 *
 * @example
 * const config = await loadMergedUserConfig<MyConfigType>(ctx);
 */
export async function loadMergedUserConfig<T extends object>(ctx: BaseCommand): Promise<T> {
    const globalConfig = await loadGlobalUserConfig<T>(ctx) || {};
    const localConfig = await loadLocalUserConfig<T>(ctx) || {};

    return deepmerge(globalConfig, localConfig) as T;
}

/**
 * Loads the global user configuration.
 *
 * @template T - The shape of the configuration object.
 * @param {BaseCommand} ctx - The command context.
 * @returns {Promise<T | null>} The global configuration or `null` if it doesn't exist.
 */
export async function loadGlobalUserConfig<T extends object>(ctx: BaseCommand): Promise<null | T> {
    return readUserConfig<T>(ctx, {
        rootDir: await getConfigDirPath(ctx, true),
        type: "global",
    });
}

/**
 * Loads the local user configuration.
 *
 * @template T - The shape of the configuration object.
 * @param {BaseCommand} ctx - The command context.
 * @returns {Promise<T | null>} The local configuration or `null` if it doesn't exist.
 */
export async function loadLocalUserConfig<T extends object>(ctx: BaseCommand): Promise<null | T> {
    return readUserConfig<T>(ctx, {
        rootDir: await getConfigDirPath(ctx, false),
        type: "local",
    });
}

/**
 * Saves or merges data into the global user configuration file.
 *
 * @template T - The shape of the configuration object.
 * @param {BaseCommand} ctx - The command context.
 * @param {Partial<T>} data - The configuration data to merge into the existing global config.
 * @returns {Promise<void>}
 */
export async function saveGlobalUserConfig<T extends object>(ctx: BaseCommand, data: Partial<T>): Promise<void> {
    const currentGlobalConfig = await loadGlobalUserConfig<Partial<T>>(ctx) || {};
    const mergedConfig = deepmerge(currentGlobalConfig, data) as Partial<T>;

    return writeUserConfigToFile<Partial<T>>(ctx, {
        data: mergedConfig,
        rootDir: await getConfigDirPath(ctx, true),
        type: "global",
    });
}

/**
 * Saves data into either the global or local configuration file.
 *
 * @template T - The shape of the configuration object.
 * @param {BaseCommand} ctx - The command context.
 * @param {boolean} global - Whether to save to global (`true`) or local (`false`) config.
 * @param {T} data - The configuration data to save.
 * @returns {Promise<void>}
 */
export async function saveUserConfig<T extends object>(ctx: BaseCommand, global: boolean, data: T): Promise<void> {
    await (global ? saveGlobalUserConfig(ctx, data) : saveLocalUserConfig(ctx, data));
}

/**
 * Saves or merges data into the local user configuration file.
 *
 * @template T - The shape of the configuration object.
 * @param {BaseCommand} ctx - The command context.
 * @param {T} data - The configuration data to merge into the existing local config.
 * @returns {Promise<void>}
 */
export async function saveLocalUserConfig<T extends object>(ctx: BaseCommand, data: T): Promise<void> {
    const currentLocalConfig = await loadLocalUserConfig<Partial<T>>(ctx) || {};
    const mergedConfig = deepmerge(currentLocalConfig, data) as Partial<T>;

    return writeUserConfigToFile<Partial<T>>(ctx, {
        data: mergedConfig,
        rootDir: await getConfigDirPath(ctx, false),
        type: "local",
    });
}

/**
 * Returns the directory path for configuration files.
 *
 * @param {Command} ctx - The command context.
 * @param {boolean} global - Whether to get the global config directory (`true`) or local (`false`).
 * @returns {Promise<string>} The directory path for configuration files.
 *
 * @example
 * const globalDir = await getConfigDirPath(ctx, true);
 * const localDir = await getConfigDirPath(ctx, false);
 */
export async function getConfigDirPath(ctx: Command, global: boolean): Promise<string> {
    if (global) {
        return ctx.config.configDir;
    }

    const repositoryRootPath = await getRepositoryRootPath();
    return path.join(repositoryRootPath, `.git`);
}
