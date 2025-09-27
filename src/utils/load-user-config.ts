import fs from "fs-extra";
import os from "node:os";
import path from "node:path";

import { createEmptyConfigFile } from "./create-empty-config-file.js";
import { getRepositoryRootPath } from "./get-repository-root-path.ts";

export async function loadUserConfig<T>(commandId: string): Promise<T> {
    const globalConfig = await loadGlobalUserConfig<T>(commandId)
    console.log('globalConfig :>>', globalConfig);


    const localConfig = await loadLocalUserConfig<T>(commandId)

    return { ...globalConfig, ...localConfig };
}

export async function loadUserConfigForOutput<T extends Record<string, string>>(commandId: string): Promise<T> {
    const globalConfig = await loadGlobalUserConfig<T>(commandId);
    const localConfig = await loadLocalUserConfig<T>(commandId);

    const globalWithMarker = Object.fromEntries(
        Object.entries(globalConfig).map(([key, value]) => [key, `${value} (global)`])
    ) as T;

    return { ...globalWithMarker, ...localConfig };
}


export async function readConfig<T>(configPath: string): Promise<T> {
    if (await fs.pathExists(configPath)) {
        try {
            return await fs.readJSON(configPath) as T;
        } catch (error) {
            console.warn(`Error reading config: ${error}. Using defaults.`);
            await createEmptyConfigFile(configPath);
        }
    } else {
        console.log("Config not found. Creating a new one with defaults.");
        await createEmptyConfigFile(configPath);
    }

    return {} as T;
}

export async function getConfigFilePath(commandId: string, global =  false) {
    if(global) {
        return path.join(os.homedir(), `/.config/${commandId}/config.json`);
    }

    const repositoryRootPath = await getRepositoryRootPath();
    return path.join(repositoryRootPath, `.git/${commandId}.config.json`);
}

export async function loadGlobalUserConfig<T>(commandId: string): Promise<T> {
    return readConfig<T>(await getConfigFilePath(commandId, true));
}

export async function loadLocalUserConfig<T>(commandId: string): Promise<T> {
    return readConfig<T>(await getConfigFilePath(commandId));
}

export async function saveUserConfig<T>(commandId: string, config: Partial<T>, global = false) {
    const configPath = await getConfigFilePath(commandId, global);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}
