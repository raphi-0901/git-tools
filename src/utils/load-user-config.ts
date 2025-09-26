import fs from "fs-extra";
import os from "node:os";
import path from "node:path";

import { createEmptyConfigFile } from "./create-empty-config-file.js";
import { getRepositoryRootPath } from "./get-repository-root-path.ts";

export const loadUserConfig = async (commandId: string) => {
    const globalConfigPath = path.join(os.homedir(), ".config/auto-commit/config.json");
    let globalConfig: Record<string, unknown> = {};

    console.log('Global config path:', globalConfigPath);

    if (await fs.pathExists(globalConfigPath)) {
        try {
            globalConfig = await fs.readJSON(globalConfigPath);
        } catch (error) {
            console.warn(`Error reading global config: ${error}. Using defaults.`);
            await createEmptyConfigFile(globalConfigPath);
        }
    } else {
        console.log("Global config not found. Creating a new one with defaults.");
        await createEmptyConfigFile(globalConfigPath);
    }

    const rootPath = await getRepositoryRootPath();
    const configPath = path.join(rootPath, ".git/auto-commit.config.json");
    let repoConfig: Record<string, unknown> = {};

    if (await fs.pathExists(configPath)) {
        try {
            repoConfig = await fs.readJSON(configPath);
        } catch (error) {
            console.warn(`Error reading repository config: ${error}. Using defaults.`);
            await createEmptyConfigFile(configPath);
        }
    } else {
        console.log("Repository config not found. Creating a new one with defaults.");
        await createEmptyConfigFile(configPath);
    }

    return { ...globalConfig, ...repoConfig };
};
