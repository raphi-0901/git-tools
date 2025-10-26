import {search} from '@inquirer/prompts';
import {Command, Flags} from "@oclif/core";
import chalk from "chalk";
import * as z from "zod";

import {gatherAutoBranchConfigForHostname} from "../../utils/gather-auto-branch-config.js";
import {promptForValue} from "../../utils/prompt-for-value.js";
import {selectConfigProperty} from "../../utils/select-config-property.js";
import {selectConfigScope} from "../../utils/select-config-scope.js";
import {getConfigFilePath, loadUserConfig, saveUserConfig} from "../../utils/user-config.js";
import {
    AutoBranchConfigKeys,
    AutoBranchConfigSchema,
    AutoBranchUpdateConfig,
    AutoBranchUpdateConfigSchema
} from "../../zod-schema/auto-branch-config.js";

export default class AutoBranchConfigCommand extends Command {
    static flags = {
        global: Flags.boolean({description: "Set configuration globally"}),
    };
    public readonly commandId = "auto-branch"

    async catch() {
        this.log(chalk.red("🚫 Cancelled."));
    }

    async run(): Promise<void> {
        const {flags} = await this.parse(AutoBranchConfigCommand);
        const loadGlobalPath = flags.global || await selectConfigScope() === "global";
        const configPath = await getConfigFilePath(this.commandId, loadGlobalPath);
        const config = await loadUserConfig<AutoBranchUpdateConfig>(this, this.commandId, loadGlobalPath);
        const {shape} = AutoBranchConfigSchema;

        // Interactive flow with inquirer
        const selectedKey = await selectConfigProperty(AutoBranchConfigKeys)

        const fieldSchema = shape[selectedKey];

        if (fieldSchema instanceof z.ZodString) {
            const value = await promptForValue({
                currentValue: config[selectedKey],
                key: selectedKey,
                schema: fieldSchema,
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

            const newGatheredConfigForHostname = await gatherAutoBranchConfigForHostname(allHostnames, hostname, configAtCurrentKey[hostname]);
            if(newGatheredConfigForHostname) {
                configAtCurrentKey[hostname] = newGatheredConfigForHostname
            } else {
                delete configAtCurrentKey[hostname];
            }

            Object.assign(config, {[selectedKey]: configAtCurrentKey});
        }

        await saveUserConfig(this.commandId, config, loadGlobalPath);
        this.log(chalk.cyan(`📂 Configuration saved at ${configPath}`));
    }
}
