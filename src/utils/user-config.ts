import { Command } from "@oclif/core";
import chalk from "chalk";
import { deepmerge } from "deepmerge-ts";
import fs from "fs-extra";
import os from "node:os";
import path from "node:path";

import { UserConfig } from "../types/user-config.js";
import * as LOGGER from "../utils/logging.js";
import { createEmptyConfigFile } from "./create-empty-config-file.js";
import { getRepositoryRootPath } from "./get-repository-root-path.js";

export async function loadMergedUserConfig<T>(ctx: Command, commandId: string): Promise<T> {
    const globalConfig = await loadGlobalUserConfig<T>(ctx, commandId)
    const localConfig = await loadLocalUserConfig<T>(ctx, commandId)

    return deepmerge(globalConfig, localConfig) as T;
}

function markGlobal<T>(value: T): T {
    if (typeof value === "string") {
        return `${value} (global)` as unknown as T;
    }

    if (Array.isArray(value)) {
        return value.map((item) => markGlobal(item)) as unknown as T;
    }

    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value).map(([k, v]) => [k, markGlobal(v)])
        ) as unknown as T;
    }

    return value;
}

export async function loadUserConfigForOutput<T extends UserConfig>(ctx: Command, commandId: string): Promise<T> {
    const globalConfig = await loadGlobalUserConfig<Partial<T>>(ctx, commandId);
    const localConfig = await loadLocalUserConfig<Partial<T>>(ctx, commandId);

    const globalWithMarker = markGlobal(globalConfig) as T;

    return deepmerge(globalWithMarker, localConfig) as T;
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

export function printAvailableConfiguration(ctx: Command, config: Record<string, unknown>): void {
    if (Object.keys(config).length === 0) {
        ctx.log(chalk.blue("ℹ️ Configuration is empty."));
    } else {
        ctx.log(chalk.blue("ℹ️ Current configuration:"));
        printConfigurationHelper(ctx, config, 2);
    }
}

export function printConfiguration(ctx: Command, config: Record<string, unknown>): void {
    if (Object.keys(config).length === 0) {
        ctx.log(chalk.blue("ℹ️ Configuration is empty."));
    } else {
        ctx.log(chalk.blue("ℹ️ Current configuration:"));
        printConfigurationHelper(ctx, config, 2);
    }
}

function printConfigurationHelper(ctx: Command, config: Record<string, unknown>, indent: number): void {
    const pad = " ".repeat(indent);

    for (const [key, value] of Object.entries(config)) {
        if (value && typeof value === "object" && !Array.isArray(value)) {
            // Nested object → recurse
            ctx.log(`${pad}${chalk.blue(key)}:`);
            printConfigurationHelper(ctx, value as Record<string, unknown>, indent + 2);
        } else if (Array.isArray(value)) {
            // Array → print each element on a new line
            ctx.log(`${pad}${chalk.yellow(key)}:`);
            for (const item of value) {
                ctx.log(`${pad}  - ${chalk.green(JSON.stringify(item))}`);
            }
        } else {
            // Primitives
            let formatted: string;
            switch (typeof value) {
                case "boolean": {
                    formatted = chalk.red(value);
                    break;
                }

                case "number": {
                    formatted = chalk.magenta(value);
                    break;
                }

                case "string": {
                    formatted = chalk.green(value);
                    break;
                }

                default: {
                    formatted = chalk.cyan(String(value));
                }
            }

            ctx.log(`${pad}${chalk.yellow(key)}: ${formatted}`);
        }
    }
}

// export function logSingleValue(ctx: Command, key: AllowedKey, value: object | string | undefined): void {
//     const keyFromAllowedKey = ctx.getKeyFromAllowedKey(key);
//     const isHostSpecific = ctx.isHostSpecific(key);
//     const typeInfo = isHostSpecific
//         ? 'host-specific (use "hostname=value")'
//         : 'string';
//
//     if (value === undefined) {
//     ctx.log(chalk.blue(`ℹ️ No value set for "${keyFromAllowedKey}" (${typeInfo})`));
//
//     const helpText = isHostSpecific
//         ? chalk.gray(`💡 You can set it with: git-tools ${ctx.commandId} config ${keyFromAllowedKey} <host>=<value>`)
//         : chalk.gray(`💡 You can set it with: git-tools ${ctx.commandId} config ${keyFromAllowedKey} <value>`)
//     ctx.log(helpText);
//     return;
// }
//
// if (typeof value === "object" && value !== null) {
//     ctx.logConfiguration(value as Record<string, unknown>);
// } else {
//     ctx.log(chalk.blue(`ℹ️ Current value of "${keyFromAllowedKey}": `) + chalk.green(`"${value}"`));
// }
// }
