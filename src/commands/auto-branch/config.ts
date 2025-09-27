import { BaseConfigCommand } from "../../shared/base-config-command.js";

export default class AutoBranchConfigCommand extends BaseConfigCommand {
    constructor(argv: string[], config: never) {
        super(argv, config, {
            allowedKeys: ["API_KEY", "GROQ_API_KEY", "INSTRUCTIONS", "EMAIL"],
            commandId: 'auto-branch',
        });
    }

    async run(): Promise<void> {
        await this.runConfigLogic();
    }
}
