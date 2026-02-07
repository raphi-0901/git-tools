import terminalLink from "terminal-link";

import AutoBranchCommand from "../../commands/auto-branch/index.js";
import { renderCommitMessageInput } from "../../ui/CommitMessageInput.js";
import { renderTextInput } from "../../ui/TextInput.js";
import {
    AutoBranchServiceConfig,
    AutoBranchServiceTypeValues,
    AutoBranchUpdateConfig
} from "../../zod-schema/autoBranchConfig.js";
import { gatherAutoBranchConfigForHostname } from "../gatherAutoBranchConfigForHostname.js";
import { getSchemaForUnionOfAutoBranch } from "../getSchemaForUnionOfAutoBranch.js";
import * as LOGGER from "../logging.js";
import { getGroqApiKeyConfig } from "./handleGroqApiKeyConfig.js";
import { loadMergedUserConfig } from "./userConfigHelpers.js";

export async function getAutoBranchConfig(ctx: AutoBranchCommand, hostname: string) {
    const userConfig = await loadMergedUserConfig<AutoBranchUpdateConfig>(ctx);
    const groqApiCheck = await getGroqApiKeyConfig(ctx, userConfig.GROQ_API_KEY)
    let askForSavingSettings = groqApiCheck.finalGroqApiKey === userConfig.GROQ_API_KEY;

    let finalServiceConfigOfHostname: AutoBranchServiceConfig | undefined;
    const allHostnamesFromConfig = userConfig.HOSTNAMES ?? {};
    if (allHostnamesFromConfig[hostname] === undefined) {
        LOGGER.log(ctx, "");
        LOGGER.warn(ctx, `No config found for hostname: ${hostname}`);
        askForSavingSettings = true;
        finalServiceConfigOfHostname = await gatherAutoBranchConfigForHostname(ctx, Object.keys(allHostnamesFromConfig), hostname, allHostnamesFromConfig[hostname]);
        if (!finalServiceConfigOfHostname) {
            // should never happen
            LOGGER.fatal(ctx, `No service config found for hostname: ${hostname}`)
        }
    } else {
        const serviceType = allHostnamesFromConfig[hostname].type;
        if (!serviceType || !AutoBranchServiceTypeValues.includes(serviceType)) {
            LOGGER.fatal(
                ctx,
                `Not supported type "${serviceType}" found for: ${hostname}\nAvailable service types: ${AutoBranchServiceTypeValues.join(", ")}`,
            );
        }

        const serviceConfig = allHostnamesFromConfig[hostname]!;
        const schemaForType = getSchemaForUnionOfAutoBranch(serviceType)!;

        // validate against schema
        const isSafe = schemaForType.safeParse(serviceConfig)
        if (isSafe.success) {
            finalServiceConfigOfHostname = isSafe.data;
        } else {
            LOGGER.debug(ctx, `Invalid config found for hostname: ${hostname}. Error: ${isSafe.error.message}`)
            askForSavingSettings = true;
            finalServiceConfigOfHostname = await gatherAutoBranchConfigForHostname(ctx, Object.keys(allHostnamesFromConfig), hostname, allHostnamesFromConfig[hostname]);
            if (!finalServiceConfigOfHostname) {
                // should never happen
                LOGGER.fatal(ctx, `No service config found for hostname: ${hostname}`)
            }
        }
    }

    if (!finalServiceConfigOfHostname) {
        // should never happen
        LOGGER.fatal(ctx, `No service config found for hostname: ${hostname}`);
    }

    return {
        askForSavingSettings,
        finalGroqApiKey: groqApiCheck.finalGroqApiKey,
        finalServiceConfigOfHostname,
        remainingTokensForLLM: groqApiCheck.remainingTokensForLLM,
    }
}
