import { BaseCommand } from '../../base-commands/BaseCommand.js'
import { renderSelectInput } from '../../ui/SelectInput.js'
import { saveUserConfig } from './userConfigHelpers.js'

export async function saveGatheredSettings<T extends object>(ctx: BaseCommand, configForOverwrite: Partial<T>) {
    const saveSettingsIn = await renderSelectInput({
        items: (['No', 'Global', 'Repository'] as const).map(type => ({
            label: type,
            value: type,
        })),
        message: 'Want to save the settings?'
    })

    if (saveSettingsIn === 'No') {
        return
    }

    await saveUserConfig(ctx, saveSettingsIn === 'Global', configForOverwrite)
}
