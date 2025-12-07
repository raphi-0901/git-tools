import * as z from "zod";

import { renderTextInput } from "../ui/TextInput.js";

export async function promptForValue<T>({
                                     currentValue,
                                     customMessage,
                                     key,
                                     schema
                                 }: {
    currentValue?: string;
    customMessage?: string;
    key: string;
    schema: z.ZodSchema<T>;
}) {
    return renderTextInput({
        defaultValue: currentValue,
        message: customMessage || `Enter a value for "${key}" (leave empty to unset):`,
        validate(value) {
            const parsed = schema.safeParse(value);
            if (parsed.success) {
                return true;
            }

            return parsed.error.issues[0].message;
        }
    });
}
