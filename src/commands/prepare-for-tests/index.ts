import { Args, Flags } from "@oclif/core";
import chalk from "chalk";
import { simpleGit } from "simple-git";

import { BaseCommand } from "../../base-commands/BaseCommand.js";
import { getService } from "../../services/index.js";
import { IssueSummary } from "../../types/IssueSummary.js";
import { renderSelectInput } from "../../ui/SelectInput.js";
import { renderTextInput } from "../../ui/TextInput.js";
import { checkIfInGitRepository } from "../../utils/checkIfInGitRepository.js";
import { checkoutAllRemoteBranchesLocally } from "../../utils/checkoutAllRemoteBranchesLocally.js";
import { promptForTextConfigValue } from "../../utils/config/promptForConfigValue.js";
import { saveGatheredSettings } from "../../utils/config/saveGatheredSettings.js";
import { loadMergedUserConfig } from "../../utils/config/userConfigHelpers.js";
import { SIGINT_ERROR_NUMBER } from "../../utils/constants.js";
import { gatherAutoBranchConfigForHostname } from "../../utils/gatherAutoBranchConfigForHostname.js";
import { getSchemaForUnionOfAutoBranch } from "../../utils/getSchemaForUnionOfAutoBranch.js";
import { getSimpleGit } from "../../utils/getSimpleGit.js";
import { countTokens } from "../../utils/gptTokenizer.js";
import { isOnline } from "../../utils/isOnline.js";
import { ChatMessage, LLMChat } from "../../utils/LLMChat.js";
import * as LOGGER from "../../utils/logging.js";
import { obtainValidGroqApiKey } from "../../utils/obtainValidGroqApiKey.js";
import {
    AutoBranchConfigSchema,
    AutoBranchServiceConfig, AutoBranchServiceTypeValues,
    AutoBranchUpdateConfig
} from "../../zod-schema/autoBranchConfig.js";

export default class PrepareForTestsCommand extends BaseCommand {
    static description = "Checks out all remote branches locally";
    static flags = {
        time: Flags.string({
            default: new Date().toISOString(),
            description: "Provide a timestamp for the branch-cleanup script to use.",
        }),
    };
    public readonly commandId = "prepare-for-tests";
    public readonly configId = "prepare"

    async catch(error: unknown) {
        super.catch(error);
        this.log(chalk.red("🚫 Preparation failed."));
    }

    async run() {
        const { flags } = await this.parse(PrepareForTestsCommand);
        await checkIfInGitRepository(this);

        const git = getSimpleGit();
        const status = await git.status();

        if (!status.isClean()) {
            LOGGER.fatal(
                this,
                "Working directory is not clean. Please commit or stash your changes before running this command."
            );
        }

        const isDate = Date.parse(flags.time);
        if (Number.isNaN(isDate)) {
            LOGGER.fatal(this, `Invalid date format: ${flags.time}. Expected format: YYYY-MM-DDTHH:mm:ss.SSSZ`)
        }

        await isOnline(this)

        this.spinner.text = "Checking out all remote branches locally..."
        this.spinner.start();

        await checkoutAllRemoteBranchesLocally(this)

        this.spinner.stop();
    }
}
