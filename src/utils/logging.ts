import chalk from "chalk";
import * as z from "zod";

import { ExtendedCommand } from "../types/ExtendedCommand.js";
import { FATAL_ERROR_NUMBER } from "./constants.js";
import { stopSpinner } from "./spinner.js";

/**
 * Info logs (normal operation).
 */
export function log(ctx: ExtendedCommand, message: string): void {
    stopSpinner(ctx)
    ctx.log(`${chalk.cyan.bold("ℹ️  INFO:")} ${message}`);
}

/**
 * Warning logs (something might be wrong).
 */
export function warn(ctx: ExtendedCommand, message: string): void {
    stopSpinner(ctx)
    ctx.log(`${chalk.yellow.bold("⚠️  WARN:")} ${chalk.yellow(message)}`);
}

/**
 * Error logs (non-fatal, execution continues).
 */
export function error(ctx: ExtendedCommand, message: string): void {
    stopSpinner(ctx)
    ctx.log(`${chalk.red.bold("❌ ERROR:")} ${chalk.red(message)}`);
}

/**
 * Fatal error logs (terminates command, never returns).
 */
export function fatal(ctx: ExtendedCommand, message: string): never {
    stopSpinner(ctx)
    ctx.log(`${chalk.red.bold("💥 FATAL:")} ${chalk.red(message)}`);
    return ctx.exit(FATAL_ERROR_NUMBER);
}

/**
 * Debug logs (only shown when the `--debug` flag is set).
 */
export function debug(ctx: ExtendedCommand, message: string) {
    if(!ctx.argv.includes('--debug')) {
        return;
    }

    stopSpinner(ctx)

    ctx.log(`${chalk.blue.bold("\u{1F50D} DEBUG:")} ${chalk.gray(message)}`);
}

export function zodError(ctx: ExtendedCommand, error: z.ZodError) {
    stopSpinner(ctx)

    const message = error.issues
        .map(
            (issue) =>
                `• Path: ${issue.path.join(".") || "(root)"} | Message: ${issue.message}`
        )
        .join("\n");

    fatal(ctx, message);
}
