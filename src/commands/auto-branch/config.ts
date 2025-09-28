import {BaseConfigCommand} from "../../shared/base-config-command.js";

export default class AutoBranchConfigCommand extends BaseConfigCommand {
    constructor(argv: string[], config: never) {
        super(argv, config, {
            allowedKeys: [
                {
                    isObject: true,
                    key: "API_KEY",
                },{
                    isObject: true,
                    key: "EMAIL",
                },
                "GROQ_API_KEY",
                "INSTRUCTIONS",
                "DEFAULT_HOSTNAME"
            ],
            commandId: 'auto-branch',
        });
    }

    async run(): Promise<void> {
        await this.runConfigLogic();
    }
}
