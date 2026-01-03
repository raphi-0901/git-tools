import { Command } from "@oclif/core";
import * as z from "zod";

import { renderTextInput } from "../../ui/TextInput.js";
import { withPromptExit } from "../withPromptExist.js";

type TextParams = {
    currentValue?: string;
    customMessage?: string;
    schema?: z.ZodSchema;
}

/**
 * Prompts the user to input a text value, optionally validating it against a Zod schema.
 *
 * @param {Command} ctx - The command context, used for rendering the prompt.
 * @param {TextParams} [params] - Optional parameters for customizing the prompt behavior.
 * @param {string} [params.currentValue] - The current value to prefill in the prompt.
 * @param {string} [params.customMessage] - Custom message to display in the prompt.
 * @param {import('zod').ZodTypeAny} [params.schema] - Optional Zod schema to validate the input against.
 *
 * @returns {Promise<string | undefined>} The user-provided value if valid, or `undefined` if the user exits or leaves it empty.
 *
 * @example
 * const value = await promptForTextConfigValue(ctx, {
 *   currentValue: 'default',
 *   customMessage: 'Enter your name:',
 *   schema: z.string().min(3)
 * });
 */
export async function promptForTextConfigValue(ctx: Command, params?: TextParams) {
    return withPromptExit(ctx, () => renderTextInput({
        defaultValue: params?.currentValue,
        message: params?.customMessage || `Enter a value (leave empty to unset):`,
        validate(value: string) {
            if(!params?.schema) {
                return true;
            }

            const parsed = params.schema.safeParse(value);
            if (parsed.success) {
                return true;
            }

            return parsed.error.issues[0].message;
        }
    }));
}
