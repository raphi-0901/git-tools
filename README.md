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
@rwirnsberger/git-tools/1.2.0 linux-x64 node-v22.21.1
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

_See code: [src/commands/auto-branch/index.ts](https://github.com/raphi-0901/git-tools/blob/v1.2.0/src/commands/auto-branch/index.ts)_

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

_See code: [src/commands/auto-commit/index.ts](https://github.com/raphi-0901/git-tools/blob/v1.2.0/src/commands/auto-commit/index.ts)_
<!-- commandsstop -->
