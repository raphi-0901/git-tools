import {Args, Command, Flags} from "@oclif/core";
import chalk from "chalk";
import { deepmerge } from "deepmerge-ts";

import {UserConfig} from "../types/user-config.js";
import {
    getConfigFilePath,
    loadGlobalUserConfig,
    loadLocalUserConfig,
    loadUserConfigForOutput,
    saveUserConfig
} from "../utils/user-config.js";

type AllowedKey = string | {
    isObject: boolean,
    key: string,
};

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
            description: 'Value for the configuration key (leave empty to get current value). For host-specific keys: host=value',
            name: "value",
            required: false,
        }),
    };
    protected static example = []
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
        return typeof allowedKey === "string" ? allowedKey : allowedKey.key;
    }

    protected isHostSpecific(allowedKey: AllowedKey) {
        return typeof allowedKey !== "string" && allowedKey.isObject;
    }

    protected logConfiguration(config: UserConfig): void {
        for (const [key, value] of Object.entries(config)) {
            if (typeof value === "object" && value !== null) {
                this.log(chalk.blue(`  ${key}:`));
                for (const [subKey, subValue] of Object.entries(value)) {
                    this.log(`    ${chalk.yellow(subKey)}: ${chalk.green(subValue)}`);
                }
            } else {
                this.log(`  ${chalk.yellow(key)}: ${chalk.green(value)}`);
            }
        }
    }

    protected logSingleValue(key: AllowedKey, value: object | string | undefined): void {
        const keyFromAllowedKey = this.getKeyFromAllowedKey(key);
        const isHostSpecific = this.isHostSpecific(key);
        const typeInfo = isHostSpecific
            ? 'host-specific (use "hostname=value")'
            : 'string';

        if (value === undefined) {
            this.log(chalk.blue(`ℹ️ No value set for "${keyFromAllowedKey}" (${typeInfo})`));

            const helpText = isHostSpecific
                ? chalk.gray(`💡 You can set it with: git-tools ${this.commandId} config ${keyFromAllowedKey} <host>=<value>`)
                : chalk.gray(`💡 You can set it with: git-tools ${this.commandId} config ${keyFromAllowedKey} <value>`)
            this.log(helpText);
        } else if (typeof value === "object" && value !== null) {
            this.log(chalk.blue(`ℹ️ Current values for "${keyFromAllowedKey}" (${typeInfo}):`));
            const keyObj = value as UserConfig;
            for (const [host, val] of Object.entries(keyObj)) {
                this.log(`  ${chalk.yellow(host)}: ${chalk.green(val)}`);
            }
        } else {
            this.log(chalk.blue(`ℹ️ Current value of "${keyFromAllowedKey}" (${typeInfo}): `) + chalk.green(`"${value}"`));
        }
    }

    protected async runConfigLogic(): Promise<void> {
        const {args, flags} = await this.parse(BaseConfigCommand);
        const configPath = await getConfigFilePath(this.commandId, flags.global);

        // If no key is provided, show full configuration
        if (!args.key) {
            const configForOutput = await loadUserConfigForOutput<UserConfig>(this, this.commandId);
            if (Object.keys(configForOutput).length === 0) {
                this.log(chalk.blue("ℹ️ Configuration is empty."));
            } else {
                this.log(chalk.blue("ℹ️ Current configuration:"));
                this.logConfiguration(configForOutput);
            }

            // Also show allowed keys for guidance
            this.log(chalk.blue("\nℹ️ Allowed configuration keys:"));
            for (const key of this.allowedKeys) {
                const keyName = this.getKeyFromAllowedKey(key);
                const typeInfo = this.isHostSpecific(key) ? "(host-specific)" : "(string)";
                this.log(`  ${chalk.yellow(keyName)} ${chalk.gray(typeInfo)}`);
            }

            return;
        }

        const validatedKey = this.validateKey(args.key);
        const keyFromAllowedKey = this.getKeyFromAllowedKey(validatedKey);

        const config = flags.global
            ? await loadGlobalUserConfig<UserConfig>(this, this.commandId)
            : await loadLocalUserConfig<UserConfig>(this, this.commandId);

        if (args.value === undefined) {
            const currentValue = config[keyFromAllowedKey];
            this.logSingleValue(validatedKey, currentValue);
            return;
        }



        // Handle host-specific keys
        if (this.isHostSpecific(validatedKey) && args.value.includes("=") && args.value.includes(":")) {

            const indexOfFirstEqualSign = args.value.indexOf('=');
            if (indexOfFirstEqualSign === -1) {
                throw new Error('❌ Invalid format. Use "hostname:subkey=value".');
            }

            const value = args.value.slice(indexOfFirstEqualSign + 1);
            let keyObj = config[keyFromAllowedKey] as undefined | UserConfig;

            if(keyObj === undefined)
            {
                config[keyFromAllowedKey] = {};
                keyObj = config[keyFromAllowedKey] as UserConfig;
            }

            if (value === "") {
                delete keyObj[keyFromAllowedKey];
                this.log(chalk.green(`✅ Removed "${keyFromAllowedKey}"`));
            } else {
                const keyPart = args.value.slice(0, indexOfFirstEqualSign);
                config[keyFromAllowedKey] = deepmerge(config[keyFromAllowedKey] ?? {}, this.convertStringToObject(keyPart, value));
                this.log(chalk.green(`✅ Set "${keyFromAllowedKey}"`));
            }
        } else if (args.value === "") {
            delete config[keyFromAllowedKey];
            this.log(chalk.green(`✅ Removed "${keyFromAllowedKey}"`));
        } else {
            config[keyFromAllowedKey] = args.value;
            this.log(chalk.green(`✅ Set "${keyFromAllowedKey}" to "${args.value}"`));
        }

        await saveUserConfig(this.commandId, config, flags.global);
        this.log(chalk.cyan(`📂 Configuration saved at ${configPath}`));
    }


    protected validateKey(key: string) {
        const lowerCaseKey = key.toLowerCase();
        const foundKey = this.allowedKeys.find(allowedKey => this.getKeyFromAllowedKey(allowedKey).toLowerCase() === lowerCaseKey);

        if (!foundKey) {
            const allowedKeyNames = this.allowedKeys.map(k => this.getKeyFromAllowedKey(k)).join(", ");
            this.error(chalk.red(`❌ Invalid key "${key}". Allowed keys: ${allowedKeyNames}`));
        }

        return foundKey;
    }

    private convertStringToObject(path: string, value: string)
    {
        const keys = path.split(':');
        const dataModel = {} as Record<string, object | string>;
        let object = dataModel;
        while (keys.length > 0)
        {
            const part = keys.shift();
            if(part === undefined) {
                break;
            }

            if (keys.length > 0 )
            {
                object[part] = {};
                object = object[part] as Record<string, object | string>;
            }
            else
            {
                object[part] = value;
            }
        }

        return dataModel;
    }
}
