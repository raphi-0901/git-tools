import { Command } from "@oclif/core";
import * as z from "zod";

import { FormValues, renderCommitMessageInput } from "../../ui/CommitMessageInput.js";
import { renderTextInput } from "../../ui/TextInput.js";
import { SIGINT_ERROR_NUMBER } from "../constants.js";

type TextParams = {
    currentValue?: string;
    customMessage?: string;
    schema?: z.ZodSchema;
}

type CommitMessageParams = {
    defaultValues?: FormValues,
    message: string;
}

export async function promptForTextConfigValue(ctx: Command, params?: TextParams) {
    const promptedFinalValue = await promptForValue({
        currentValue: params?.currentValue,
        customMessage: params?.customMessage,
        schema: params?.schema,
    })

    if (promptedFinalValue === null) {
        ctx.exit(SIGINT_ERROR_NUMBER)
    }

    return promptedFinalValue
}

export async function promptForCommitMessageValue(ctx: Command, { defaultValues, message }: CommitMessageParams) {
    const result = await renderCommitMessageInput({
        defaultValues,
        message
    });

    if (result === null) {
        ctx.exit(SIGINT_ERROR_NUMBER)
    }

    return result
}

export async function promptForValue<T>({
                                            currentValue,
                                            customMessage,
                                            schema
                                        }: {
    currentValue?: string;
    customMessage?: string;
    schema?: z.ZodSchema<T>;
}) {
    return renderTextInput({
        defaultValue: currentValue,
        message: customMessage || `Enter a value (leave empty to unset):`,
        validate(value: string) {
            if(!schema) {
                return true;
            }

            const parsed = schema.safeParse(value);
            if (parsed.success) {
                return true;
            }

            return parsed.error.issues[0].message;
        }
    });
}
