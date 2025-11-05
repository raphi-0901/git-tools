import { select } from "@inquirer/prompts";
import { Command } from "@oclif/core";
import { deepmerge } from "deepmerge-ts";

import * as LOGGER from "./logging.js";
import { loadGlobalUserConfig, loadLocalUserConfig, saveUserConfig } from "./user-config.js";

export async function saveGatheredSettings<T>(ctx: Command, commandId: string, configForOverwrite: Partial<T>) {
    const saveSettingsIn = await select({
        choices: (["No", "Global", "Repository"] as const).map(type => ({
            description: type,
            name: type,
            value: type,
        })),
        message: 'Want to save the settings?'
    });

    if (saveSettingsIn === "No") {
        return;
    }

    const isGlobal = saveSettingsIn === "Global";
    const userConfigForRewrite = isGlobal
        ? await loadGlobalUserConfig<Partial<T>>(ctx, commandId)
        : await loadLocalUserConfig<Partial<T>>(ctx, commandId)

    const mergedConfig = deepmerge(userConfigForRewrite, configForOverwrite) as Partial<T>;
    await saveUserConfig<T>(commandId, mergedConfig, isGlobal)

    LOGGER.log(ctx, "Successfully stored config.")
}
