import {BaseConfigCommand} from "../../shared/base-config-command.js";

export default class AutoBranchConfigCommand extends BaseConfigCommand {
    static examples = [
        // Simple example
        '<%= config.bin %> <%= command.id %> --help',
        // Examples for setting API_KEY
        {
            command: '<%= config.bin %> <%= command.id %> API_KEY myhost=my-api-key',
            description: 'Set the API_KEY for a host',
        },
        {
            command: '<%= config.bin %> <%= command.id %> API_KEY myhost=',
            description: 'Remove the API_KEY for a host',
        },
        // Examples for setting EMAIL
        {
            command: '<%= config.bin %> <%= command.id %> EMAIL myhost=user@example.com',
            description: 'Set the EMAIL for a host',
        },
        {
            command: '<%= config.bin %> <%= command.id %> EMAIL myhost=',
            description: 'Remove the EMAIL for a host',
        },
        // Examples for regular keys
        {
            command: '<%= config.bin %> <%= command.id %> GROQ_API_KEY my-groq-key',
            description: 'Set the GROQ_API_KEY',
        },
        {
            command: '<%= config.bin %> <%= command.id %> GROQ_API_KEY ""',
            description: 'Remove the GROQ_API_KEY',
        }
    ];

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
