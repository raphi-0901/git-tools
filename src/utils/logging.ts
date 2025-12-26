import chalk from 'chalk'

import { BaseCommand } from '../base-commands/BaseCommand.js'
import { FATAL_ERROR_NUMBER } from './constants.js'

function withSpinner(ctx: BaseCommand, fn: () => void) {
    const wasSpinning = ctx.spinner.isSpinning
    if (wasSpinning) {
        ctx.spinner.stop()
    }

    fn()
    if (wasSpinning) {
        ctx.spinner.start()
    }
}

/**
 * Info logs (normal operation).
 */
export function log(ctx: BaseCommand, message: string): void {
    withSpinner(ctx, () => {
        ctx.log(`${chalk.cyan.bold('ℹ️  INFO:')} ${message}`)
    })
}

/**
 * Warning logs.
 */
export function warn(ctx: BaseCommand, message: string): void {
    withSpinner(ctx, () => {
        ctx.log(`${chalk.yellow.bold('⚠️  WARN:')} ${chalk.yellow(message)}`)
    })
}

/**
 * Error logs.
 */
export function error(ctx: BaseCommand, message: string): void {
    withSpinner(ctx, () => {
        ctx.log(`${chalk.red.bold('❌ ERROR:')} ${chalk.red(message)}`)
    })
}

/**
 * Fatal error logs (terminates command).
 */
export function fatal(ctx: BaseCommand, message: string): never {
    withSpinner(ctx, () => {
        ctx.log(`${chalk.red.bold('💥 FATAL:')} ${chalk.red(message)}`)
    })

    return ctx.exit(FATAL_ERROR_NUMBER)
}

/**
 * Debug logs.
 */
export function debug(ctx: BaseCommand, message: string) {
    if (!ctx.argv.includes('--debug')) {
        return
    }

    withSpinner(ctx, () => {
        ctx.log(`${chalk.blue.bold('\u{1F50D} DEBUG:')} ${chalk.gray(message)}`)
    })
}
