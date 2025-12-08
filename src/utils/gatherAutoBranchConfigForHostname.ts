import { Command } from "@oclif/core";

import { renderSelectInput } from "../ui/SelectInput.js";
import { AutoBranchServiceConfig, AutoBranchServiceTypeValues } from "../zod-schema/auto-branch-config.js";
import { promptForTextConfigValue } from "./config/promptForConfigValue.js";
import { SIGINT_ERROR_NUMBER } from "./constants.js";
import { getSchemaForUnionOfAutoBranch } from "./get-schema-for-union-of-auto-branch.js";

// TODO maybe one function for creating a new config and one for editing an existing one?
export async function gatherAutoBranchConfigForHostname(ctx: Command, allHostnames: string[], hostnameToAdd: string, currentConfig: Partial<AutoBranchServiceConfig> = {}) {
    let newConfig: Partial<AutoBranchServiceConfig> = { ...currentConfig };
    const baseServiceChoices = AutoBranchServiceTypeValues.map((type) => ({
        label: type,
        value: type,
    }));

    const deleteChoice =
        allHostnames.includes(hostnameToAdd)
            ? { label: "delete", value: "delete" } as const
            : null;

    const serviceType = await renderSelectInput({
        items: deleteChoice ? [...baseServiceChoices, deleteChoice] : baseServiceChoices,
        message: "Select your service type",
    });

    if (serviceType === null) {
        ctx.exit(SIGINT_ERROR_NUMBER)
    }

    if (serviceType === 'delete') {
        return
    }

    newConfig.type = serviceType;

    // get current options of service from zod
    const schemaForType = getSchemaForUnionOfAutoBranch(serviceType)!;

    // todo try to fit examples into this for loop
    for (const [key, fieldSchema] of Object.entries(schemaForType.shape)) {
        if (key === "type") {
            continue
        }

        if (fieldSchema === schemaForType.shape.examples) {
            // only if no examples are provided yet
            const currentValue = newConfig?.examples
            if(Array.isArray(currentValue)) {
                continue
            }

            const examples = []
            while(true) {
                const example = await promptForTextConfigValue(ctx, {
                    customMessage: "Provide some examples of branch names you would like to generate: (leave empty if you don't want to provide any further examples)",
                    schema: schemaForType.shape.examples.element
                });

                if(example.trim() === "") {
                    break;
                }

                examples.push(example)
            }

            newConfig = {
                ...newConfig,
                [key as keyof AutoBranchServiceConfig]: examples
            }
        } else {
            const currentValue = newConfig?.[key as keyof AutoBranchServiceConfig]

            // should never happen, but for TS
            if(Array.isArray(currentValue)) {
                continue;
            }

            const answerForKey = await promptForTextConfigValue(ctx, {
                currentValue,
                customMessage: `Enter a value for ${key}:`,
                schema: fieldSchema,
            });

            if (answerForKey === "") {
                delete newConfig[key as keyof AutoBranchServiceConfig];
                continue
            }

            newConfig = {
                ...newConfig,
                [key as keyof AutoBranchServiceConfig]: answerForKey
            }
        }
    }

    return newConfig as AutoBranchServiceConfig
}

