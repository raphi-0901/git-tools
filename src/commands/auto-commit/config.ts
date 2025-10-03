import { BaseConfigCommand } from "../../shared/base-config-command.js";

export default class AutoCommitConfigCommand extends BaseConfigCommand {
    static examples = [
        // Simple help example
        '<%= config.bin %> <%= command.id %> --help',
        // Examples for GROQ_API_KEY
        {
            command: '<%= config.bin %> <%= command.id %> GROQ_API_KEY my-groq-key',
            description: 'Set the GROQ_API_KEY',
        },
        {
            command: '<%= config.bin %> <%= command.id %> GROQ_API_KEY ""',
            description: 'Remove the GROQ_API_KEY',
        },
        // Examples for INSTRUCTIONS
        {
            command: '<%= config.bin %> <%= command.id %> INSTRUCTIONS "Follow these steps..."',
            description: 'Set the INSTRUCTIONS',
        },
        {
            command: '<%= config.bin %> <%= command.id %> INSTRUCTIONS ""',
            description: 'Remove the INSTRUCTIONS',
        }
    ];

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
