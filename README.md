git-tools
=================

A new CLI generated with oclif


[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/git-tools.svg)](https://npmjs.org/package/git-tools)
[![Downloads/week](https://img.shields.io/npm/dw/git-tools.svg)](https://npmjs.org/package/git-tools)


<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @rwirnsberger/git-tools
$ git-tools COMMAND
running command...
$ git-tools (--version)
@rwirnsberger/git-tools/1.5.0 linux-x64 node-v22.21.1
$ git-tools --help [COMMAND]
USAGE
  $ git-tools COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`git-tools all`](#git-tools-all)
* [`git-tools auto-branch ISSUEURL`](#git-tools-auto-branch-issueurl)
* [`git-tools auto-branch config`](#git-tools-auto-branch-config)
* [`git-tools auto-commit`](#git-tools-auto-commit)
* [`git-tools auto-commit config`](#git-tools-auto-commit-config)
* [`git-tools branch-cleanup`](#git-tools-branch-cleanup)

## `git-tools all`

Diverges every 5th branch

```
USAGE
  $ git-tools all [--cleanBefore]

FLAGS
  --cleanBefore  Cleans up all local branches except main before starting and resets main to be synced with remote.

DESCRIPTION
  Diverges every 5th branch
```

_See code: [src/commands/all/index.ts](https://github.com/raphi-0901/git-tools/blob/v1.5.0/src/commands/all/index.ts)_

## `git-tools auto-branch ISSUEURL`

Generate Git branch names from Jira tickets with AI suggestions and interactive feedback

```
USAGE
  $ git-tools auto-branch ISSUEURL [--debug] [-y]

ARGUMENTS
  ISSUEURL  Jira issue ID to fetch

FLAGS
  -y, --yes    Skip confirmation prompt
      --debug  Show debug logs.

DESCRIPTION
  Generate Git branch names from Jira tickets with AI suggestions and interactive feedback
```

_See code: [src/commands/auto-branch/index.ts](https://github.com/raphi-0901/git-tools/blob/v1.5.0/src/commands/auto-branch/index.ts)_

## `git-tools auto-branch config`

Opens up the configuration for the auto-branch command.

```
USAGE
  $ git-tools auto-branch config

DESCRIPTION
  Opens up the configuration for the auto-branch command.
```

_See code: [src/commands/auto-branch/config.ts](https://github.com/raphi-0901/git-tools/blob/v1.5.0/src/commands/auto-branch/config.ts)_

## `git-tools auto-commit`

Automatically generate commit messages from staged files with feedback loop

```
USAGE
  $ git-tools auto-commit [--debug] [-y] [--reword <value>]

FLAGS
  -y, --yes             Skip confirmation prompt
      --debug           Show debug logs.
      --reword=<value>  Rewords the commit message of the given commit. The commit hash must be provided.

DESCRIPTION
  Automatically generate commit messages from staged files with feedback loop
```

_See code: [src/commands/auto-commit/index.ts](https://github.com/raphi-0901/git-tools/blob/v1.5.0/src/commands/auto-commit/index.ts)_

## `git-tools auto-commit config`

Opens up the configuration for the auto-commit command.

```
USAGE
  $ git-tools auto-commit config

DESCRIPTION
  Opens up the configuration for the auto-commit command.
```

_See code: [src/commands/auto-commit/config.ts](https://github.com/raphi-0901/git-tools/blob/v1.5.0/src/commands/auto-commit/config.ts)_

## `git-tools branch-cleanup`

```
USAGE
  $ git-tools branch-cleanup [--debug] [-y] [--dryRun] [-p <value>...] [--skipTargetSelection] [--staleDays <value>]
    [--staleDaysBehind <value>] [--staleDaysDiverged <value>] [--staleDaysLocal <value>]

FLAGS
  -p, --protectedBranches=<value>...  Regex for protected branches. Will not be deleted even if they are stale.
  -y, --yes                           Skip confirmation prompt
      --debug                         Show debug logs.
      --dryRun                        Run without actually deleting branches
      --skipTargetSelection           Skip target branch selection. If set, all protected branches will be considered as
                                      potential targets.
      --staleDays=<value>             [default: 30] Number of days since last commit after which a branch is considered
                                      stale. If set without staleDaysDiverged/staleDaysLocal/staleDaysBehind, those will
                                      default to staleDays × 3.
      --staleDaysBehind=<value>       Number of days for behind-only branches (default: staleDays)
      --staleDaysDiverged=<value>     Number of days for diverged branches (default: staleDays × 3)
      --staleDaysLocal=<value>        Number of days for local-only branches (default: staleDays × 3)
```

_See code: [src/commands/branch-cleanup/index.ts](https://github.com/raphi-0901/git-tools/blob/v1.5.0/src/commands/branch-cleanup/index.ts)_
<!-- commandsstop -->
