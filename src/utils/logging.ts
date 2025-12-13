import chalk from "chalk";

import { BaseCommand } from "../base-commands/BaseCommand.js";
import { FATAL_ERROR_NUMBER } from "./constants.js";

/**
 * Info logs (normal operation).
 */
export function log(ctx: BaseCommand, message: string): void {
    ctx.spinner.stop()
    ctx.log(`${chalk.cyan.bold("ℹ️  INFO:")} ${message}`);
}

/**
 * Warning logs (something might be wrong).
 */
export function warn(ctx: BaseCommand, message: string): void {
    ctx.spinner.stop()

    ctx.log(`${chalk.yellow.bold("⚠️  WARN:")} ${chalk.yellow(message)}`);
}

/**
 * Error logs (non-fatal, execution continues).
 */
export function error(ctx: BaseCommand, message: string): void {
    ctx.spinner.stop()
    ctx.log(`${chalk.red.bold("❌ ERROR:")} ${chalk.red(message)}`);
}

/**
 * Fatal error logs (terminates command, never returns).
 */
export function fatal(ctx: BaseCommand, message: string): never {
    ctx.spinner.stop()
    ctx.log(`${chalk.red.bold("💥 FATAL:")} ${chalk.red(message)}`);

    return ctx.exit(FATAL_ERROR_NUMBER);
}

/**
 * Debug logs (only shown when the `--debug` flag is set).
 */
export function debug(ctx: BaseCommand, message: string) {
    if (!ctx.argv.includes('--debug')) {
        return;
    }

    ctx.spinner.stop()
    ctx.log(`${chalk.blue.bold("\u{1F50D} DEBUG:")} ${chalk.gray(message)}`);
}
