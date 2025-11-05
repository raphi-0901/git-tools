import { Command, Flags } from "@oclif/core";
import chalk from "chalk";

import { promptForValue } from "../../utils/prompt-for-value.js";
import { selectConfigProperty } from "../../utils/select-config-property.js";
import { selectConfigScope } from "../../utils/select-config-scope.js";
import { getConfigFilePath, loadUserConfig, saveUserConfig } from "../../utils/user-config.js";
import {
    AutoCommitConfigKeys,
    AutoCommitConfigSchema,
    AutoCommitUpdateConfig
} from "../../zod-schema/auto-commit-config.js";

export default class AutoCommitConfigCommand extends Command {
    static flags = {
        global: Flags.boolean({ description: "Set configuration globally" }),
    };
    public readonly commandId = "auto-commit"

    async catch() {
        this.log(chalk.red("🚫 Cancelled."));
    }

    async run(): Promise<void> {
        const { flags } = await this.parse(AutoCommitConfigCommand);
        const { shape } = AutoCommitConfigSchema;

        const loadGlobalPath = flags.global || await selectConfigScope() === "global";
        const configPath = await getConfigFilePath(this.commandId, loadGlobalPath);
        const config = await loadUserConfig<AutoCommitUpdateConfig>(this, this.commandId, loadGlobalPath);

        const selectedKey = await selectConfigProperty(AutoCommitConfigKeys)
        const fieldSchema = shape[selectedKey];

        const value = await promptForValue({
            currentValue: config[selectedKey],
            key: selectedKey,
            schema: fieldSchema,
        });

        config[selectedKey] = value === "" ? undefined : value

        await saveUserConfig(this.commandId, config, loadGlobalPath);
        this.log(chalk.cyan(`📂 Configuration saved at ${configPath}`));
    }
}
