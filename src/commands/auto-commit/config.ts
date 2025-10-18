import {input, select} from '@inquirer/prompts';
import {Command, Flags} from "@oclif/core";
import chalk from "chalk";

import {selectConfigScope} from "../../utils/select-config-scope.js";
import {getConfigFilePath, loadUserConfig, saveUserConfig} from "../../utils/user-config.js";
import {
    AutoCommitConfigKeys,
    AutoCommitUpdateConfig
} from "../../zod-schema/auto-commit-config.js";

export default class AutoCommitConfigCommand extends Command {
    static flags = {
        global: Flags.boolean({description: "Set configuration globally"}),
    };
    public readonly commandId = "auto-commit"

    async run(): Promise<void> {
        const {flags} = await this.parse(AutoCommitConfigCommand);

        const loadGlobalPath = flags.global || await selectConfigScope() === "global";
        const configPath = await getConfigFilePath(this.commandId, loadGlobalPath);
        const config = await loadUserConfig<AutoCommitUpdateConfig>(this, this.commandId, loadGlobalPath);

        // Interactive flow with inquirer
        const selectedKey = await select({
            choices: AutoCommitConfigKeys.map(key => ({
                name: key,
                value: key,
            })),
            message: "Which configuration key do you want to set?",
        });

        const value = await input({
            default: config[selectedKey] as string | undefined,
            message: `Enter a value for "${selectedKey}" (leave empty to unset):`,
        });

        config[selectedKey] = value === "" ? undefined : value

        await saveUserConfig(this.commandId, config, loadGlobalPath);
        this.log(chalk.cyan(`📂 Configuration saved at ${configPath}`));
    }
}
