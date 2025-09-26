import fs from "fs-extra";
import os from "node:os";
import path from "node:path";

import {createEmptyConfigFile} from "./create-empty-config-file.js";
import {getRepositoryRootPath} from "./get-repository-root-path.ts";

export const loadUserConfig = async (commandId: string) => {
    const globalConfigPath = path.join(os.homedir(), ".config/auto-commit/config.json");
    let globalConfig: Record<string, unknown> = {};

    console.log('globalConfigPath :>>', globalConfigPath);


    if (await fs.pathExists(globalConfigPath)) {
        try {
            globalConfig = await fs.readJSON(globalConfigPath);
        } catch (error) {
            console.warn(`Fehler beim Lesen der globalen Config: ${error}. Es werden Defaults verwendet.`);
            await createEmptyConfigFile(globalConfigPath);
        }
    } else {
        await createEmptyConfigFile(globalConfigPath)
    }

    const rootPath = await getRepositoryRootPath();
    const configPath = path.join(rootPath, ".git/auto-commit.config.json");
    let repoConfig: Record<string, unknown> = {};

    if (await fs.pathExists(configPath)) {
        try {
            repoConfig = await fs.readJSON(configPath);
        } catch {
            console.warn(`Fehler beim Lesen der repo Config. Es werden Defaults verwendet.`);
            await createEmptyConfigFile(configPath);
        }
    } else {
        await createEmptyConfigFile(configPath);
    }

    return { ...globalConfig, ...repoConfig };
}
