import { Command } from "@oclif/core";
import chalk from "chalk";
import * as z from "zod";

import { FATAL_ERROR_NUMBER } from "./constants.js";

/**
 * Info logs (normal operation).
 */
export function log(ctx: Command, message: string): void {
    ctx.log(`${chalk.cyan.bold("ℹ️  INFO:")} ${message}`);
}

/**
 * Warning logs (something might be wrong).
 */
export function warn(ctx: Command, message: string): void {
    ctx.log(`${chalk.yellow.bold("⚠️  WARN:")} ${chalk.yellow(message)}`);
}

/**
 * Error logs (non-fatal, execution continues).
 */
export function error(ctx: Command, message: string): void {
    ctx.log(`${chalk.red.bold("❌ ERROR:")} ${chalk.red(message)}`);
}

/**
 * Fatal error logs (terminates command, never returns).
 */
export function fatal(ctx: Command, message: string): never {
    const formatted = `${chalk.red.bold("💥 FATAL:")} ${chalk.red(message)}`;

    ctx.log(formatted);
    return ctx.exit(FATAL_ERROR_NUMBER);
}

export function zodError(ctx: Command, error: z.ZodError) {
    const message = error.issues
        .map(
            (issue) =>
                `• Path: ${issue.path.join(".") || "(root)"} | Message: ${issue.message}`
        )
        .join("\n");

    fatal(ctx, message);
}
