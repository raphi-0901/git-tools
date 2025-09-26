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
$ npm install -g git-tools
$ git-tools COMMAND
running command...
$ git-tools (--version)
git-tools/0.0.0 linux-x64 node-v22.14.0
$ git-tools --help [COMMAND]
USAGE
  $ git-tools COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`git-tools hello PERSON`](#git-tools-hello-person)
* [`git-tools hello world`](#git-tools-hello-world)
* [`git-tools help [COMMAND]`](#git-tools-help-command)
* [`git-tools plugins`](#git-tools-plugins)
* [`git-tools plugins add PLUGIN`](#git-tools-plugins-add-plugin)
* [`git-tools plugins:inspect PLUGIN...`](#git-tools-pluginsinspect-plugin)
* [`git-tools plugins install PLUGIN`](#git-tools-plugins-install-plugin)
* [`git-tools plugins link PATH`](#git-tools-plugins-link-path)
* [`git-tools plugins remove [PLUGIN]`](#git-tools-plugins-remove-plugin)
* [`git-tools plugins reset`](#git-tools-plugins-reset)
* [`git-tools plugins uninstall [PLUGIN]`](#git-tools-plugins-uninstall-plugin)
* [`git-tools plugins unlink [PLUGIN]`](#git-tools-plugins-unlink-plugin)
* [`git-tools plugins update`](#git-tools-plugins-update)

## `git-tools hello PERSON`

Say hello

```
USAGE
  $ git-tools hello PERSON -f <value>

ARGUMENTS
  PERSON  Person to say hello to

FLAGS
  -f, --from=<value>  (required) Who is saying hello

DESCRIPTION
  Say hello

EXAMPLES
  $ git-tools hello friend --from oclif
  hello friend from oclif! (./src/commands/hello/index.ts)
```

_See code: [src/commands/hello/index.ts](https://github.com/raphi-0901/git-tools/blob/v0.0.0/src/commands/hello/index.ts)_

## `git-tools hello world`

Say hello world

```
USAGE
  $ git-tools hello world

DESCRIPTION
  Say hello world

EXAMPLES
  $ git-tools hello world
  hello world! (./src/commands/hello/world.ts)
```

_See code: [src/commands/hello/world.ts](https://github.com/raphi-0901/git-tools/blob/v0.0.0/src/commands/hello/world.ts)_

## `git-tools help [COMMAND]`

Display help for git-tools.

```
USAGE
  $ git-tools help [COMMAND...] [-n]

ARGUMENTS
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for git-tools.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.33/src/commands/help.ts)_

## `git-tools plugins`

List installed plugins.

```
USAGE
  $ git-tools plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ git-tools plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.47/src/commands/plugins/index.ts)_

## `git-tools plugins add PLUGIN`

Installs a plugin into git-tools.

```
USAGE
  $ git-tools plugins add PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into git-tools.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the GIT_TOOLS_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the GIT_TOOLS_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ git-tools plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ git-tools plugins add myplugin

  Install a plugin from a github url.

    $ git-tools plugins add https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ git-tools plugins add someuser/someplugin
```

## `git-tools plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ git-tools plugins inspect PLUGIN...

ARGUMENTS
  PLUGIN...  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ git-tools plugins inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.47/src/commands/plugins/inspect.ts)_

## `git-tools plugins install PLUGIN`

Installs a plugin into git-tools.

```
USAGE
  $ git-tools plugins install PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into git-tools.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the GIT_TOOLS_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the GIT_TOOLS_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ git-tools plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ git-tools plugins install myplugin

  Install a plugin from a github url.

    $ git-tools plugins install https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ git-tools plugins install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.47/src/commands/plugins/install.ts)_

## `git-tools plugins link PATH`

Links a plugin into the CLI for development.

```
USAGE
  $ git-tools plugins link PATH [-h] [--install] [-v]

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ git-tools plugins link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.47/src/commands/plugins/link.ts)_

## `git-tools plugins remove [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ git-tools plugins remove [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ git-tools plugins unlink
  $ git-tools plugins remove

EXAMPLES
  $ git-tools plugins remove myplugin
```

## `git-tools plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ git-tools plugins reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.47/src/commands/plugins/reset.ts)_

## `git-tools plugins uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ git-tools plugins uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ git-tools plugins unlink
  $ git-tools plugins remove

EXAMPLES
  $ git-tools plugins uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.47/src/commands/plugins/uninstall.ts)_

## `git-tools plugins unlink [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ git-tools plugins unlink [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ git-tools plugins unlink
  $ git-tools plugins remove

EXAMPLES
  $ git-tools plugins unlink myplugin
```

## `git-tools plugins update`

Update installed plugins.

```
USAGE
  $ git-tools plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.47/src/commands/plugins/update.ts)_
<!-- commandsstop -->
