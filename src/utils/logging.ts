import chalk from "chalk";

import { BaseCommand } from "../base-commands/BaseCommand.js";
import { FATAL_ERROR_NUMBER } from "./constants.js";

/**
 * Executes a function while temporarily stopping the spinner if it's active.
 *
 * @param ctx The command context containing the spinner.
 * @param fn The function to execute while the spinner is paused.
 */
function withSpinner(ctx: BaseCommand, fn: () => void) {
    const wasSpinning = ctx.spinner.isSpinning;
    if (wasSpinning) {
        ctx.spinner.stop();
    }

    fn();
    if (wasSpinning) {
        ctx.spinner.start();
    }
}

/**
 * Logs a normal message to the console.
 *
 * @param ctx The command context.
 * @param message The message to log.
 */
export function log(ctx: BaseCommand, message: string): void {
    withSpinner(ctx, () => {
        ctx.log(message);
    });
}

/**
 * Logs an informational message.
 *
 * @param ctx The command context.
 * @param message The info message.
 */
export function info(ctx: BaseCommand, message: string): void {
    withSpinner(ctx, () => {
        ctx.log(`${chalk.cyan.bold("ℹ️  INFO:")} ${message}`);
    });
}

/**
 * Logs a warning message.
 *
 * @param ctx The command context.
 * @param message The warning message.
 */
export function warn(ctx: BaseCommand, message: string): void {
    withSpinner(ctx, () => {
        ctx.log(`${chalk.yellow.bold("⚠️  WARN:")} ${chalk.yellow(message)}`);
    });
}

/**
 * Logs an error message.
 *
 * @param ctx The command context.
 * @param message The error message.
 */
export function error(ctx: BaseCommand, message: string): void {
    withSpinner(ctx, () => {
        ctx.log(`${chalk.red.bold("❌ ERROR:")} ${chalk.red(message)}`);
    });
}

/**
 * Logs a fatal error message and terminates the command.
 *
 * @param ctx The command context.
 * @param message The fatal error message.
 * @returns Never returns; terminates the process.
 */
export function fatal(ctx: BaseCommand, message: string): never {
    ctx.spinner.stop(); // stop spinner to avoid unnecessary newlines
    ctx.log(`${chalk.red.bold("💥 FATAL:")} ${chalk.red(message)}`);

    return ctx.exit(FATAL_ERROR_NUMBER);
}

/**
 * Logs a debug message if the `--debug` flag is present in argv.
 *
 * @param ctx The command context.
 * @param message The debug message.
 */
export function debug(ctx: BaseCommand, message: string) {
    if (!ctx.argv.includes("--debug")) {
        return;
    }

    withSpinner(ctx, () => {
        ctx.log(`${chalk.blue.bold("\u{1F50D} DEBUG:")} ${chalk.gray(message)}`);
    });
}
