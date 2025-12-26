#!/usr/bin/env node

import { execute } from '@oclif/core'
import chalk from 'chalk'

process.on('SIGINT', async () => {
    console.log(chalk.red('🚫 Cancelled.'))
})

process.on('SIGTERM', async () => {
    console.log(chalk.red('🚫 Cancelled.'))
})

await execute({
 dir: import.meta.url 
})
