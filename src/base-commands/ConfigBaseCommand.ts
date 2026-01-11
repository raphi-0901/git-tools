import chalk from "chalk";

import { renderSelectInput } from "../ui/SelectInput.js";
import { getConfigDirPath } from "../utils/config/userConfigHelpers.js";
import { getSimpleGit } from "../utils/getSimpleGit.js";
import * as LOGGER from "../utils/logging.js";
import { openInFileExplorer } from "../utils/openInFileExplorer.js";
import { withPromptExit } from "../utils/withPromptExist.js";
import { BaseCommand } from "./BaseCommand.js";

export abstract class ConfigBaseCommand extends BaseCommand {
    configId = "config";

    /** Override if a command should *not* offer repo scope */
    protected allowRepositoryScope(): boolean {
        return true;
    }

    async catch(error: unknown) {
        super.catch(error);
        this.log(chalk.red("🚫 Cancelled."));
    }

    async run() {
        const git = getSimpleGit();
        const isInGitRepository = this.allowRepositoryScope() && (await git.checkIsRepo());

        let scope: "Global" | "Repository" = "Global";

        if (isInGitRepository) {
            scope = await withPromptExit(this, () =>
                renderSelectInput({
                    items: (["Global", "Repository"] as const).map(type => ({
                        label: type,
                        value: type,
                    })),
                    message: "Which scope do you want to open?",
                })
            );
        }

        LOGGER.log(this, `📂 Opening ${chalk.bold(scope.toLowerCase())} config folder...`);

        const pathToOpen = await getConfigDirPath(
            this,
            scope === "Global",
        );

        openInFileExplorer(pathToOpen);
    }
}
