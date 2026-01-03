import chalk from "chalk";

import { BaseCommand } from "../../base-commands/BaseCommand.js";
import { checkIfInGitRepository } from "../../utils/checkIfInGitRepository.js";
import { checkoutAllRemoteBranchesLocally } from "../../utils/checkoutAllRemoteBranchesLocally.js";
import { getSimpleGit } from "../../utils/getSimpleGit.js";
import { isOnline } from "../../utils/isOnline.js";
import * as LOGGER from "../../utils/logging.js";

export default class CheckoutAllRemoteBranches extends BaseCommand<typeof CheckoutAllRemoteBranches> {
    static description = "Checks out all remote branches locally";
    public readonly commandId = "checkout-all-remote-branches";
    public readonly configId = "checkout"

    async catch(error: unknown) {
        super.catch(error);
        this.log(chalk.red("🚫 Preparation failed."));
    }

    async run() {
        await checkIfInGitRepository(this);

        const git = getSimpleGit();
        const status = await git.status();

        if (!status.isClean()) {
            LOGGER.fatal(
                this,
                "Working directory is not clean. Please commit or stash your changes before running this command."
            );
        }

        await isOnline(this)

        this.spinner.text = "Checking out all remote branches locally..."
        this.spinner.start();

        await checkoutAllRemoteBranchesLocally(this)

        this.spinner.stop();
    }
}
