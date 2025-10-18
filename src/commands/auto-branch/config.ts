import {input, search, select} from '@inquirer/prompts';
import {Command, Flags} from "@oclif/core";
import chalk from "chalk";
import * as z from "zod";

import {selectConfigScope} from "../../utils/select-config-scope.js";
import {getConfigFilePath, loadUserConfig, saveUserConfig} from "../../utils/user-config.js";
import {
    AutoBranchConfigKeys,
    AutoBranchConfigSchema,
    AutoBranchServiceTypesConfig,
    AutoBranchServiceTypeValues,
    AutoBranchUpdateConfig,
    AutoBranchUpdateConfigSchema
} from "../../zod-schema/auto-branch-config.js";

function getSchemaForType(type: AutoBranchServiceTypesConfig) {
    const unionSchema = AutoBranchConfigSchema.shape.HOSTNAMES.def.valueType;
    return unionSchema.options.find(opt => opt.shape.type.value === type);
}

export default class AutoBranchConfigCommand extends Command {
    static flags = {
        global: Flags.boolean({description: "Set configuration globally"}),
    };
    public readonly commandId = "auto-branch"

    async run(): Promise<void> {
        const {flags} = await this.parse(AutoBranchConfigCommand);
        const loadGlobalPath = flags.global || await selectConfigScope() === "global";
        const configPath = await getConfigFilePath(this.commandId, loadGlobalPath);
        const config = await loadUserConfig<AutoBranchUpdateConfig>(this, this.commandId, loadGlobalPath);
        const {shape} = AutoBranchConfigSchema;

        // Interactive flow with inquirer
        const selectedKey = await select({
            choices: AutoBranchConfigKeys.map(key => ({
                name: key,
                value: key,
            })),
            message: "Which configuration key do you want to set?",
        });

        const fieldSchema = shape[selectedKey];

        if (fieldSchema instanceof z.ZodString) {
            const value = await input({
                default: config[selectedKey] as string | undefined,
                message: `Enter a value for "${selectedKey}" (leave empty to unset):`,
            });

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            config[selectedKey] = value === "" ? undefined : value
        } else if (fieldSchema instanceof z.ZodRecord) {
            let configAtCurrentKey = config[selectedKey]

            if (configAtCurrentKey === undefined || typeof configAtCurrentKey === "string") {
                configAtCurrentKey = {}
            }

            const allHostnames = Object.keys(configAtCurrentKey);
            const hostname = await search<string>(
                {
                    message: "Enter hostname (write new one to create):",
                    source(input) {
                        if (!input) {
                            return allHostnames;
                        }

                        const result = allHostnames.filter(hostname => hostname.toUpperCase().includes(input.toUpperCase()))

                        return [...result, input]
                    },
                    validate(value) {
                        const validateInput = AutoBranchUpdateConfigSchema.shape.HOSTNAMES.def.innerType.def.innerType.def.keyType.safeParse(value)
                        if (validateInput.success) {
                            return true
                        }

                        return validateInput.error.issues[0].message;
                    }
                },
            );

            configAtCurrentKey[hostname] ??= {}

            const baseServiceChoices = AutoBranchServiceTypeValues.map((type) => ({
                name: type,
                value: type,
            }));

            const deleteChoice =
                allHostnames.includes(hostname)
                    ? {name: "delete", value: "delete"} as const
                    : null;

            const serviceType = await select({
                choices: deleteChoice ? [...baseServiceChoices, deleteChoice] : baseServiceChoices,
                default: configAtCurrentKey[hostname].type,
                message: "Select your service type",
            });

            if (serviceType === 'delete') {
                delete configAtCurrentKey[hostname]
            } else {
                configAtCurrentKey[hostname].type = serviceType;

                // get current options of service from zod
                const schemaForType = getSchemaForType(serviceType)!;
                for (const [key, fieldSchema] of Object.entries(schemaForType.shape)) {
                    if (key === "type") {
                        continue
                    }

                    // eslint-disable-next-line no-await-in-loop
                    const answerForKey = await input({
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-expect-error
                        default: configAtCurrentKey[hostname]?.[key] as string | undefined,
                        message: `Enter ${key}:`,
                        validate(value) {
                            const parsed = fieldSchema.safeParse(value);
                            if (parsed.success) {
                                return true
                            }

                            return parsed.error.issues[0].message;
                        },
                    });

                    if (answerForKey === "") {
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-expect-error
                        delete configAtCurrentKey[hostname][key];

                        continue
                    }

                    Object.assign(configAtCurrentKey[hostname], {[key]: answerForKey});
                }
            }

            Object.assign(config, {[selectedKey]: configAtCurrentKey});
        }

        await saveUserConfig(this.commandId, config, loadGlobalPath);
        this.log(chalk.cyan(`📂 Configuration saved at ${configPath}`));
    }
}
