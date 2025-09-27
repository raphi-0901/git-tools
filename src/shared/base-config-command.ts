import {Args, Command, Flags} from "@oclif/core";

import {
    getConfigFilePath,
    loadUserConfig,
    loadUserConfigForOutput,
    saveUserConfig
} from "../utils/user-config.js";

export interface BaseConfigOptions {
    allowedKeys: string[];
    commandId: string;
}

export abstract class BaseConfigCommand extends Command {
    static args = {
        key: Args.string({
            description: "Configuration key to set or get",
            name: "key",
            required: false,
        }),
        value: Args.string({
            description: "Value for the configuration key (leave empty to get current value)",
            name: "value",
            required: false,
        }),
    };
    static flags = {
        global: Flags.boolean({description: "Set configuration globally"}),
    };
    protected allowedKeys: string[];
    protected commandId: string;

    constructor(argv: string[], config: never, options: BaseConfigOptions) {
        super(argv, config);
        this.allowedKeys = options.allowedKeys;
        this.commandId = options.commandId;
    }

    protected async runConfigLogic(): Promise<void> {
        const {args, flags} = await this.parse(BaseConfigCommand);
        const configPath = await getConfigFilePath(this.commandId, flags.global);
        const config = await loadUserConfig<Record<string, string>>(this.commandId)

        // return whole config
        if (!args.key) {
            const configForOutput = await loadUserConfigForOutput<Record<string, string>>(this.commandId)
            if (Object.keys(configForOutput).length === 0) {
                this.log("ℹ️ Configuration is empty.");
            } else {
                this.log("ℹ️ Current configuration:");
                for (const [key, value] of Object.entries(configForOutput)) {
                    this.log(`  ${key}: ${value}`);
                }
            }

            return;
        }

        const validatedKey = this.validateKey(args.key);
        if (args.value === undefined) {
            if (Object.hasOwn(config, validatedKey)) {
                this.log(`ℹ️ Current value of "${validatedKey}": "${config[validatedKey]}"`);
            } else {
                this.log(`ℹ️ No value set for "${validatedKey}"`);
            }
        } else {
            if(args.value) {
                config[validatedKey] = args.value;
            } else {
                delete config[validatedKey];
            }

            await saveUserConfig(this.commandId, config, flags.global);
            this.log(`✅ Configuration "${validatedKey}" set to "${args.value}" at ${configPath}`);
        }
    }

    protected validateKey(key: string) {
        const lowerCaseKey = key.toLowerCase();
        const foundKey = this.allowedKeys.find(allowedKey => allowedKey.toLowerCase() === lowerCaseKey);

        if(!foundKey) {
            this.error(`❌ Invalid key "${key}". Allowed keys: ${this.allowedKeys.join(", ")}`);
        }

        return foundKey
    }
}
