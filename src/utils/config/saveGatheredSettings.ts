import { BaseCommand } from "../../base-commands/BaseCommand.js";
import { renderSelectInput } from "../../ui/SelectInput.js";
import {
    saveUserConfig
} from "./userConfigHelpers.js";

/**
 * Prompts the user to choose whether and where to save gathered settings,
 * then saves the configuration if a destination is selected.
 *
 * @template T - The shape of the configuration object.
 *
 * @param {BaseCommand} ctx - The command context, providing logging and configuration info.
 * @param {Partial<T>} configForOverwrite - The configuration data to be saved, possibly partially overriding existing settings.
 *
 * @returns {Promise<void>} Resolves when the process is complete. Does nothing if the user chooses "No".
 *
 * @example
 * await saveGatheredSettings<MyConfigType>(ctx, {
 *   theme: "dark",
 *   timeout: 5000
 * });
 * // Prompts user to save settings and saves globally or in repository if selected
 */
export async function saveGatheredSettings<T extends object>(ctx: BaseCommand, configForOverwrite: Partial<T>): Promise<void> {
    const saveSettingsIn = await renderSelectInput({
        items: (["No", "Global", "Repository"] as const).map(type => ({
            label: type,
            value: type,
        })),
        message: 'Want to save the settings?'
    });

    if (saveSettingsIn === "No") {
        return;
    }

    await saveUserConfig(ctx, saveSettingsIn === "Global", configForOverwrite);
}
