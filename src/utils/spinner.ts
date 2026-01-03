import type { Options } from "yocto-spinner";

import { deepmerge } from "deepmerge-ts";
import yoctoSpinner from "yocto-spinner";

/**
 * Creates a yocto-spinner instance with custom default frames and interval.
 *
 * - Merges the provided options with the default spinner configuration.
 * - Uses a smooth animated spinner sequence by default.
 *
 * @param options Optional spinner configuration to override defaults.
 * @returns A configured yocto-spinner instance.
 */
export function createSpinner(options: Options = {}) {
    const mergedOptions = deepmerge({
        spinner: {
            "frames": [
                "⠄",
                "⠆",
                "⠇",
                "⠋",
                "⠙",
                "⠸",
                "⠰",
                "⠠",
                "⠰",
                "⠸",
                "⠙",
                "⠋",
                "⠇",
                "⠆"
            ],
            "interval": 80
        },
    }, options)

    return yoctoSpinner(mergedOptions)
}
