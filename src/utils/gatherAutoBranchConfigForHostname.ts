import { Command } from "@oclif/core";

import { renderSelectInput } from "../ui/SelectInput.js";
import {
    AutoBranchServiceConfig,
    AutoBranchServiceTypeValues
} from "../zod-schema/auto-branch-config.js";
import { AutoCommitConfigSchema } from "../zod-schema/auto-commit-config.js";
import { promptForCommitMessageConfigValue, promptForTextConfigValue } from "./config/promptForConfigValue.js";
import { SIGINT_ERROR_NUMBER } from "./constants.js";
import { getSchemaForUnionOfAutoBranch } from "./get-schema-for-union-of-auto-branch.js";

function setConfigValue(newConfig: Partial<AutoBranchServiceConfig>, key: keyof AutoBranchServiceConfig, value: string | string[] | undefined) {

}

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

    // if ("email" in schemaForType.shape) {
    //     const finalEmail = await promptForTextConfigValue(ctx, {
    //         currentValue: "email" in newConfig ? newConfig.email : "",
    //         key: 'GROQ_API_KEY',
    //         schema: schemaForType.shape.email,
    //     });
    //
    //     setConfigValue(newConfig, "examples", finalEmail)
    //
    //     if(finalEmail.trim() === "" && "email" in newConfig) {
    //         delete newConfig.email;
    //     }
    //     else {
    //         newConfig.e = finalEmail
    //     }
    // }
    //
    // if ("token" in schemaForType.shape) {
    //     const finalToken = await promptForTextConfigValue(ctx, {
    //         currentValue: "token" in newConfig ? newConfig.token : "",
    //         key: 'GROQ_API_KEY',
    //         schema: schemaForType.shape.token,
    //     });
    //
    //     if(finalToken.trim() === "" && "token" in newConfig) {
    //         delete newConfig.token;
    //     }
    //     else {
    //         newConfig.type = finalEmail
    //     }
    // }
    //
    // if ("examples" in schemaForType.shape) {
    //     const examples = []
    //     while(true) {
    //         const result = await promptForCommitMessageConfigValue(ctx, {
    //             message: "Provide some examples of commit messages you would like to generate: (leave empty if you don't want to provide any further examples)"
    //         })
    //
    //         if(result.message.trim() === "" && result?.description.join(',').trim() === "") {
    //             break;
    //         }
    //
    //         const example = `${result?.message}\n${result?.description.join("\n")}`
    //         examples.push(example)
    //     }
    //
    //     if(examples.length === 0 && "examples" in newConfig) {
    //         delete newConfig.examples;
    //     }
    //     else {
    //         newConfig.type = finalEmail
    //     }
    //     newConfig.examples = examples;
    // }
    //
    // const final = await promptForTextConfigValue(this, {
    //     key: 'GROQ_API_KEY',
    //     schema: schemaForType.shape.token
    // });
    //

    // todo try to fit examples into this for loop
    for (const [key, fieldSchema] of Object.entries(schemaForType.shape)) {
        if (key === "type") {
            continue
        }

        if(fieldSchema === schemaForType.shape.examples) {
            continue;
        }

        const answerForKey = await promptForValue({
            currentValue: newConfig?.[key as keyof Omit<AutoBranchServiceConfig, "examples">],
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

