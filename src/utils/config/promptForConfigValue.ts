import { Command } from "@oclif/core";
import * as z from "zod";

import { renderTextInput } from "../../ui/TextInput.js";
import { withPromptExit } from "../withPromptExist.js";

type TextParams = {
    currentValue?: string;
    customMessage?: string;
    schema?: z.ZodSchema;
}

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
