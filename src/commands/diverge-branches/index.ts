import chalk from "chalk";

import { BaseCommand } from "../../base-commands/BaseCommand.js";
import { checkIfInGitRepository } from "../../utils/checkIfInGitRepository.js";
import { getSimpleGit } from "../../utils/getSimpleGit.js";
import {
    randomlyDeleteFirstNCommitsAndRewordLastCommitForDivergence
} from "../../utils/randomlyDeleteFirstNCommitsAndRewordLastCommitForDivergence.js";

export default class DivergenceBranchesCommand extends BaseCommand<typeof DivergenceBranchesCommand> {
    static description = "Diverges every 5th branch";
    public readonly commandId = "diverge-branches";
    public readonly configId = "diverge"

    async catch(error: unknown) {
        super.catch(error);
        this.log(chalk.red("🚫 Divergence failed."));
    }

    async run() {
        await this.parse(DivergenceBranchesCommand);
        await checkIfInGitRepository(this);

        const git = getSimpleGit();

        this.spinner.text = "Reword every 5th branch to make it diverge from the remote branch..."
        this.spinner.start();

        const allBranches = (await git.branchLocal()).all;
        for (const [index, branch] of allBranches.entries()) {
            if(index % 5 !== 0) {
                continue
            }

            await randomlyDeleteFirstNCommitsAndRewordLastCommitForDivergence(this, branch)
        }

        this.spinner.stop();
    }
}
