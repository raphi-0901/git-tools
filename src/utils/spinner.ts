import type { Options } from "yocto-spinner";

import { deepmerge } from "deepmerge-ts";
import yoctoSpinner from "yocto-spinner";

import { BaseCommand } from "../base-commands/BaseCommand.js";

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
