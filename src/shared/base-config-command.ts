import {Args, Command, Flags} from "@oclif/core";

import {UserConfig} from "../types/user-config.js";
import {
    getConfigFilePath,
    loadGlobalUserConfig, loadLocalUserConfig,
    loadUserConfig,
    loadUserConfigForOutput,
    saveUserConfig
} from "../utils/user-config.js";

type AllowedKey = string | {
    isObject: boolean,
    key: string,
}

export interface BaseConfigOptions {
    allowedKeys: AllowedKey[];
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
            description: 'Value for the configuration key (leave empty to get current value). For host-specific values: host=value',
            name: "value",
            required: false,
        }),
    };
    static flags = {
        global: Flags.boolean({description: "Set configuration globally"}),
    };
    protected allowedKeys: AllowedKey[];
    protected commandId: string;

    constructor(argv: string[], config: never, options: BaseConfigOptions) {
        super(argv, config);
        this.allowedKeys = options.allowedKeys;
        this.commandId = options.commandId;
    }

    protected getKeyFromAllowedKey(allowedKey: AllowedKey) {
        if(typeof allowedKey === "string") {
            return  allowedKey
        }

        return allowedKey.key
    }

    protected logConfiguration(config: UserConfig): void {
        for (const [key, value] of Object.entries(config)) {
            if (typeof value === "object" && value !== null) {
                this.log(`  ${key}:`);

                for (const [subKey, subValue] of Object.entries(value)) {
                    this.log(`    ${subKey}: ${subValue}`);
                }
            } else {
                this.log(`  ${key}: ${value}`);
            }
        }
    }

    protected logSingleValue(key: string, value: object | string | undefined): void {
        if (value === undefined) {
            this.log(`ℹ️ No value set for "${key}"`);
        } else if (typeof value === "object" && value !== null) {
            this.log(`ℹ️ Current values for "${key}":`);
            const keyObj = value as UserConfig;
            for (const [host, value] of Object.entries(keyObj)) {
                this.log(`  ${host}: ${value}`);
            }
        } else {
            this.log(`ℹ️ Current value of "${key}": "${value}"`);
        }
    }

    protected async runConfigLogic(): Promise<void> {
        const {args, flags} = await this.parse(BaseConfigCommand);
        const configPath = await getConfigFilePath(this.commandId, flags.global);

        // Show entire config if no key provided
        if (!args.key) {
            const configForOutput = await loadUserConfigForOutput<UserConfig>(this, this.commandId);
            if (Object.keys(configForOutput).length === 0) {
                this.log("ℹ️ Configuration is empty.");
            } else {
                this.log("ℹ️ Current configuration:");
                this.logConfiguration(configForOutput);
            }

            return;
        }

        const validatedKey = this.validateKey(args.key);
        const keyFromAllowedKey = this.getKeyFromAllowedKey(validatedKey)

        // show one specific key if value is not provided
        if (args.value === undefined) {
            const config = await loadUserConfig<UserConfig>(this, this.commandId);
            const currentValue = config[keyFromAllowedKey];
            this.logSingleValue(keyFromAllowedKey, currentValue)

            return;
        }

        const config = flags.global
            ? await loadGlobalUserConfig<UserConfig>(this, this.commandId)
            : await loadLocalUserConfig<UserConfig>(this, this.commandId);

        if (args.value.includes("=") && typeof validatedKey === "object" && validatedKey.isObject) {
            // Host-specific value
            const index = args.value.indexOf("=");
            const host = args.value.slice(0, index);
            const hostValue = args.value.slice(index + 1);

            if (!host) {
                this.error(`❌ Invalid format. Use "hostname=value" for host-specific keys.`);
            }

            if (!config[keyFromAllowedKey] || typeof config[keyFromAllowedKey] !== "object") {
                config[keyFromAllowedKey] = {};
            }

            const keyObj = config[keyFromAllowedKey] as UserConfig;

            if (hostValue === "") {
                delete keyObj[host];
                this.log(`✅ Removed host "${host}" from "${validatedKey}"`);
            } else {
                keyObj[host] = hostValue;
                this.log(`✅ Set "${validatedKey}" for host "${host}" to "${hostValue}"`);
            }
        } else {
            // Simple key-value
            if (args.value === "") {
                delete config[keyFromAllowedKey];
                this.log(`✅ Removed "${validatedKey}"`);
            } else {
                config[keyFromAllowedKey] = args.value;
                this.log(`✅ Set "${validatedKey}" to "${args.value}"`);
            }
        }

        await saveUserConfig(this.commandId, config, flags.global);
        this.log(`📂 Configuration saved at ${configPath}`);
    }

    protected validateKey(key: string) {
        const lowerCaseKey = key.toLowerCase();
        const foundKey = this.allowedKeys.find(allowedKey => {
            const keyFromAllowedKey = this.getKeyFromAllowedKey(allowedKey);
            return keyFromAllowedKey.toLowerCase() === lowerCaseKey;
        });

        if (!foundKey) {
            this.error(`❌ Invalid key "${key}". Allowed keys: ${this.allowedKeys.map(allowedKey => this.getKeyFromAllowedKey(allowedKey)).join(", ")}`);
        }

        return foundKey;
    }
}
