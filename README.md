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
@rwirnsberger/git-tools/1.0.3 linux-x64 node-v22.14.0
$ git-tools --help [COMMAND]
USAGE
  $ git-tools COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`git-tools auto-branch ISSUEID`](#git-tools-auto-branch-issueid)
* [`git-tools auto-branch config [KEY] [VALUE]`](#git-tools-auto-branch-config-key-value)
* [`git-tools auto-commit`](#git-tools-auto-commit)
* [`git-tools auto-commit config [KEY] [VALUE]`](#git-tools-auto-commit-config-key-value)
* [`git-tools wip [NAME]`](#git-tools-wip-name)
* [`git-tools wip delete`](#git-tools-wip-delete)
* [`git-tools wip list`](#git-tools-wip-list)
* [`git-tools wip restore [IDORREF]`](#git-tools-wip-restore-idorref)

## `git-tools auto-branch ISSUEID`

Generate Git branch names from Jira tickets with AI suggestions and interactive feedback

```
USAGE
  $ git-tools auto-branch ISSUEID [-i <value>]

ARGUMENTS
  ISSUEID  Jira issue ID to fetch

FLAGS
  -i, --instructions=<value>  Provide a specific instruction to the model for the commit message

DESCRIPTION
  Generate Git branch names from Jira tickets with AI suggestions and interactive feedback
```

_See code: [src/commands/auto-branch/index.ts](https://github.com/raphi-0901/git-tools/blob/v1.0.3/src/commands/auto-branch/index.ts)_

## `git-tools auto-branch config [KEY] [VALUE]`

```
USAGE
  $ git-tools auto-branch config [KEY] [VALUE] [--global]

ARGUMENTS
  KEY    Configuration key to set or get
  VALUE  Value for the configuration key (leave empty to get current value). For host-specific keys: host=value

FLAGS
  --global  Set configuration globally

EXAMPLES
  $ git-tools auto-branch config --help

  Set the API_KEY for a host

    $ git-tools auto-branch config API_KEY myhost=my-api-key

  Remove the API_KEY for a host

    $ git-tools auto-branch config API_KEY myhost=

  Set the EMAIL for a host

    $ git-tools auto-branch config EMAIL myhost=user@example.com

  Remove the EMAIL for a host

    $ git-tools auto-branch config EMAIL myhost=

  Set the GROQ_API_KEY

    $ git-tools auto-branch config GROQ_API_KEY my-groq-key

  Remove the GROQ_API_KEY

    $ git-tools auto-branch config GROQ_API_KEY ""
```

_See code: [src/commands/auto-branch/config.ts](https://github.com/raphi-0901/git-tools/blob/v1.0.3/src/commands/auto-branch/config.ts)_

## `git-tools auto-commit`

Automatically generate commit messages from staged files with feedback loop

```
USAGE
  $ git-tools auto-commit [-i <value>]

FLAGS
  -i, --instructions=<value>  Provide a specific instruction to the model for the commit message

DESCRIPTION
  Automatically generate commit messages from staged files with feedback loop
```

_See code: [src/commands/auto-commit/index.ts](https://github.com/raphi-0901/git-tools/blob/v1.0.3/src/commands/auto-commit/index.ts)_

## `git-tools auto-commit config [KEY] [VALUE]`

```
USAGE
  $ git-tools auto-commit config [KEY] [VALUE] [--global]

ARGUMENTS
  KEY    Configuration key to set or get
  VALUE  Value for the configuration key (leave empty to get current value). For host-specific keys: host=value

FLAGS
  --global  Set configuration globally

EXAMPLES
  $ git-tools auto-commit config --help

  Set the GROQ_API_KEY

    $ git-tools auto-commit config GROQ_API_KEY my-groq-key

  Remove the GROQ_API_KEY

    $ git-tools auto-commit config GROQ_API_KEY ""

  Set the INSTRUCTIONS

    $ git-tools auto-commit config INSTRUCTIONS "Follow these steps..."

  Remove the INSTRUCTIONS

    $ git-tools auto-commit config INSTRUCTIONS ""
```

_See code: [src/commands/auto-commit/config.ts](https://github.com/raphi-0901/git-tools/blob/v1.0.3/src/commands/auto-commit/config.ts)_

## `git-tools wip [NAME]`

Creates an WIP-snapshot of the current branch and saves it as a ref. Optionally nukes the working tree after creating the snapshot.

```
USAGE
  $ git-tools wip [NAME] [-f]

ARGUMENTS
  NAME  Message for identifying the WIP-snapshot. Default: WIP-Snapshot

FLAGS
  -f, --nukeWorkingTree  Nukes the working tree after creating the snapshot.

DESCRIPTION
  Creates an WIP-snapshot of the current branch and saves it as a ref. Optionally nukes the working tree after creating
  the snapshot.

EXAMPLES
  Create a WIP snapshot with the default message

    $ git-tools wip

  Create a WIP snapshot with a custom message

    $ git-tools wip "My snapshot message"

  Create a WIP snapshot and nuke the working tree

    $ git-tools wip --nukeWorkingTree

  Create a WIP snapshot with a custom message and nuke the working tree

    $ git-tools wip "My snapshot message" --nukeWorkingTree

  Shortcut using the -f flag to nuke the working tree

    $ git-tools wip "My snapshot message" -f
```

_See code: [src/commands/wip/index.ts](https://github.com/raphi-0901/git-tools/blob/v1.0.3/src/commands/wip/index.ts)_

## `git-tools wip delete`

Delete one or more WIP-Snapshots interactively.

```
USAGE
  $ git-tools wip delete [--all]

FLAGS
  --all  Delete all WIP-Snapshots without prompting for selection.

DESCRIPTION
  Delete one or more WIP-Snapshots interactively.

EXAMPLES
  $ git-tools wip delete --help

  Select snapshots interactively to delete

    $ git-tools wip delete

  Delete all WIP-Snapshots with confirmation

    $ git-tools wip delete --all
```

_See code: [src/commands/wip/delete.ts](https://github.com/raphi-0901/git-tools/blob/v1.0.3/src/commands/wip/delete.ts)_

## `git-tools wip list`

List all available WIP-Snapshots.

```
USAGE
  $ git-tools wip list

DESCRIPTION
  List all available WIP-Snapshots.

EXAMPLES
  List all WIP-Snapshots

    $ git-tools wip list
```

_See code: [src/commands/wip/list.ts](https://github.com/raphi-0901/git-tools/blob/v1.0.3/src/commands/wip/list.ts)_

## `git-tools wip restore [IDORREF]`

Restore a WIP-snapshot.

```
USAGE
  $ git-tools wip restore [IDORREF]

ARGUMENTS
  IDORREF  ID or ref of the WIP-snapshot to restore. If not provided, a list of all snapshots will be shown.

DESCRIPTION
  Restore a WIP-snapshot.

EXAMPLES
  Restore a snapshot by selecting from the interactive list

    $ git-tools wip restore

  Restore a snapshot by its ID

    $ git-tools wip restore 3

  Restore a snapshot by its ref

    $ git-tools wip restore refs/wip/my-branch-123456
```

_See code: [src/commands/wip/restore.ts](https://github.com/raphi-0901/git-tools/blob/v1.0.3/src/commands/wip/restore.ts)_
<!-- commandsstop -->
