import { Command } from "@oclif/core";

import { renderSelectInput } from "../ui/SelectInput.js";
import {
    AutoBranchServiceConfig,
    AutoBranchServiceTypeValues
} from "../zod-schema/auto-branch-config.js";
import { SIGINT_ERROR_NUMBER } from "./constants.js";
import { getSchemaForUnionOfAutoBranch } from "./get-schema-for-union-of-auto-branch.js";
import { promptForValue } from "./prompt-for-value.js";

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

    if(serviceType === null) {
        ctx.exit(SIGINT_ERROR_NUMBER)
    }

    if (serviceType === 'delete') {
        return
    }

    newConfig.type = serviceType;

    // get current options of service from zod
    const schemaForType = getSchemaForUnionOfAutoBranch(serviceType)!;
    for (const [key, fieldSchema] of Object.entries(schemaForType.shape)) {
        if (key === "type") {
            continue
        }

        const answerForKey = await promptForValue({
            currentValue: newConfig?.[key as keyof AutoBranchServiceConfig],
            key,
            schema: fieldSchema,
        })

        if (answerForKey === "") {
            delete newConfig[key as keyof AutoBranchServiceConfig];
            continue
        }

        newConfig = {
            ...newConfig,
            [key as keyof AutoBranchServiceConfig]: answerForKey
        }
    }

    return newConfig as AutoBranchServiceConfig
}
