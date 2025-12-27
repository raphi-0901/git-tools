import { BaseCommand } from "../base-commands/BaseCommand.js";
import { ListItem, renderCheckboxList } from "../ui/CheckboxList.js";
import { withPromptExit } from "./withPromptExist.js";

/**
 * Prompts the user to select which branches should be deleted.
 *
 * If `autoConfirm` is enabled, all selectable items are automatically
 * accepted without showing an interactive prompt.
 *
 * The prompt is wrapped with graceful exit handling so the command
 * can terminate cleanly if the user cancels.
 *
 * @typeParam T - The value type associated with each selectable item
 * @param command - The command context used for handling prompt exit
 * @param items - List entries rendered in the checkbox prompt
 * @param autoConfirm - Whether to skip the prompt and auto-select all items
 * @returns A promise resolving to the selected item values
 */
export async function promptBranchesToDelete<T>(
    command: BaseCommand,
    items: ListItem<T>[],
    autoConfirm: boolean
): Promise<T[]> {
    if (autoConfirm) {
        return items
            .filter(item => item.type === "item")
            .map(item => item.value);
    }

    return withPromptExit(
        command,
        () => renderCheckboxList({
            items,
            message: "Select branches to delete:"
        })
    );
}
