import { BaseConfigCommand } from "../../shared/base-config-command.js";

export default class AutoCommitConfigCommand extends BaseConfigCommand {
    constructor(argv: string[], config: never) {
        super(argv, config, {
            allowedKeys: ["GROQ_API_KEY", "INSTRUCTIONS"],
            commandId: 'auto-commit',
        });
    }

    async run(): Promise<void> {
        await this.runConfigLogic();
    }
}
