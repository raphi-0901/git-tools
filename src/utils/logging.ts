import { Command } from "@oclif/core";
import chalk from "chalk";
import { Spinner } from "yocto-spinner";
import * as z from "zod";

import { FATAL_ERROR_NUMBER } from "./constants.js";

type CommandWithSpinner = Command & { spinner?: Spinner };

function stopSpinner(ctx: CommandWithSpinner) {
    if(ctx.spinner && ctx.spinner.isSpinning) {
        ctx.spinner.stop();
    }
}

/**
 * Info logs (normal operation).
 */
export function log(ctx: CommandWithSpinner, message: string): void {
    stopSpinner(ctx)
    ctx.log(`${chalk.cyan.bold("ℹ️  INFO:")} ${message}`);
}

/**
 * Warning logs (something might be wrong).
 */
export function warn(ctx: CommandWithSpinner, message: string): void {
    stopSpinner(ctx)
    ctx.log(`${chalk.yellow.bold("⚠️  WARN:")} ${chalk.yellow(message)}`);
}

/**
 * Error logs (non-fatal, execution continues).
 */
export function error(ctx: CommandWithSpinner, message: string): void {
    stopSpinner(ctx)
    ctx.log(`${chalk.red.bold("❌ ERROR:")} ${chalk.red(message)}`);
}

/**
 * Fatal error logs (terminates command, never returns).
 */
export function fatal(ctx: CommandWithSpinner, message: string): never {
    stopSpinner(ctx)
    ctx.log(`${chalk.red.bold("💥 FATAL:")} ${chalk.red(message)}`);
    return ctx.exit(FATAL_ERROR_NUMBER);
}

export function zodError(ctx: CommandWithSpinner, error: z.ZodError) {
    stopSpinner(ctx)

    const message = error.issues
        .map(
            (issue) =>
                `• Path: ${issue.path.join(".") || "(root)"} | Message: ${issue.message}`
        )
        .join("\n");

    fatal(ctx, message);
}
