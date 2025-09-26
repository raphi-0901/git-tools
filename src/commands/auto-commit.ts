import {Command} from "@oclif/core";
import fs from "fs-extra";
import 'dotenv/config';
import path from "node:path";
import * as OpenAI from "openai";
import {simpleGit} from "simple-git";

export default class AutoCommit extends Command {
    static description = "Liste alle Git-Branches und wähle interaktiv aus";

    async run(): Promise<void> {
        const git = simpleGit();
        const diff = await git.diff(['--cached']);

        if(diff.trim().length === 0){
            this.warn("No staged files to create a commit message")
            return;
        }

        const rootPath = await git.revparse(['--show-toplevel']);
        let userConfig: Record<string, unknown> = {};

        const configPath = path.join(rootPath, ".git/auto-commit.config.json");
        if (await fs.pathExists(configPath)) {
            try {
                userConfig = await fs.readJSON(configPath);
            } catch (error) {
                this.warn(`Could not parse config file at ${configPath}. Using defaults.`);
                console.error(error);
            }
        } else {
            this.warn(`Config file not found at ${configPath}. Using defaults.`);
        }

        const branchSummary = await git.branch();
        const currentBranch = branchSummary.current;

        const input = `
            Create a commit message using following instructions and information. Make sure to return only the commit message.
            Instructions of User: "${userConfig.instruction}"
            Current Branch: "${currentBranch}"
            Diffs of Staged Files: 
            ${diff}
        `

        console.log('input :>>', input);
        const client = new OpenAI.OpenAI({
            apiKey: process.env.GROQ_API_KEY,
            baseURL: "https://api.groq.com/openai/v1"
        });

        const response = await client.responses.create({
            input,
            model: "openai/gpt-oss-20b",
        });

        console.log('response :>>', response);
        await git.commit(response.output_text);
    }
}
