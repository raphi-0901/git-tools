import type { Options } from "yocto-spinner";

import { deepmerge } from "deepmerge-ts";
import yoctoSpinner from "yocto-spinner";

import { ExtendedCommand } from "../types/ExtendedCommand.js";

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

export function setSpinnerText(ctx: ExtendedCommand, text: string) {
    if(ctx.spinner) {
        ctx.spinner.text = text;
    }
}

export function stopSpinner(ctx: ExtendedCommand) {
    if(ctx.spinner && ctx.spinner.isSpinning) {
        ctx.spinner.stop();
    }
}

export function startSpinner(ctx: ExtendedCommand) {
    if(ctx.spinner) {
        ctx.spinner.start();
    }
}
