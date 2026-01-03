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
@rwirnsberger/git-tools/1.3.0 linux-x64 node-v22.21.1
$ git-tools --help [COMMAND]
USAGE
  $ git-tools COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`git-tools auto-branch ISSUEURL`](#git-tools-auto-branch-issueurl)
* [`git-tools auto-commit`](#git-tools-auto-commit)
* [`git-tools branch-cleanup`](#git-tools-branch-cleanup)
* [`git-tools checkout-all-remote-branches`](#git-tools-checkout-all-remote-branches)
* [`git-tools diverge-branches`](#git-tools-diverge-branches)

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

_See code: [src/commands/auto-branch/index.ts](https://github.com/raphi-0901/git-tools/blob/v1.3.0/src/commands/auto-branch/index.ts)_

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

_See code: [src/commands/auto-commit/index.ts](https://github.com/raphi-0901/git-tools/blob/v1.3.0/src/commands/auto-commit/index.ts)_

## `git-tools branch-cleanup`

```
USAGE
  $ git-tools branch-cleanup [--debug] [-y] [--dryRun] [-p <value>...] [-d <value>]

FLAGS
  -d, --staleDays=<value>             [default: 30] Number of days since last commit after which a branch is considered
                                      stale
  -p, --protectedBranches=<value>...  Regex for protected branches. Will not be deleted even if they are stale.
  -y, --yes                           Skip confirmation prompt
      --debug                         Show debug logs.
      --dryRun                        Run without actually deleting branches
```

_See code: [src/commands/branch-cleanup/index.ts](https://github.com/raphi-0901/git-tools/blob/v1.3.0/src/commands/branch-cleanup/index.ts)_

## `git-tools checkout-all-remote-branches`

Checks out all remote branches locally

```
USAGE
  $ git-tools checkout-all-remote-branches [--debug] [-y]

FLAGS
  -y, --yes    Skip confirmation prompt
      --debug  Show debug logs.

DESCRIPTION
  Checks out all remote branches locally
```

_See code: [src/commands/checkout-all-remote-branches/index.ts](https://github.com/raphi-0901/git-tools/blob/v1.3.0/src/commands/checkout-all-remote-branches/index.ts)_

## `git-tools diverge-branches`

Diverges every 5th branch

```
USAGE
  $ git-tools diverge-branches [--debug] [-y]

FLAGS
  -y, --yes    Skip confirmation prompt
      --debug  Show debug logs.

DESCRIPTION
  Diverges every 5th branch
```

_See code: [src/commands/diverge-branches/index.ts](https://github.com/raphi-0901/git-tools/blob/v1.3.0/src/commands/diverge-branches/index.ts)_
<!-- commandsstop -->
