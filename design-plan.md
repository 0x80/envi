# Envi Tool

Envi makes it easy to capture all env files from a codebase in a central location that can be version controlled, and restored for new checkouts and spawning git worktree instances.

## Notable Features

- Capture all env files outside of your codebase, where you can choose to have it persist in version control
- Easily restore env files on new systems or repo checkouts
- Safely share captured env configurations with a colleague
- Easily initialize git worktree instances

## Overview

The `envi` module is executed as a command line utlity with the same name.

When asked to capture a configuration, it will traverse the codebase looking for env files. Those files can be `.env` but also `.env.local` or `.env.development` etc. It then combines all the data from all the env files and stores them in a single file, named after the current directory.

The data is stored in [MAML](https://maml.dev/spec/v0.1) format, because it is simple and strict, and guarantees object key order (which we need to fully preserve the original env file with comments).

## Implementation

### File Format

Each file in `envy-store` has the following format

```maml
{
	__envi_version: 1,
	metadata: {
		updated_from: "/Users/me/development/some/repo"
		updated_at: [isostring]
	}
	files: [
		{
			path: "path/to/file/.env.a"
			env: {
				ENV_FOR_A_1: "value_1"
				ENV_FOR_A_2: "value_2"
			}
		}
		{
			path: "path/to/file/.env.b"
			env: {
				ENV_FOR_B_1: "value_1"
				ENV_FOR_B_2: "value_2"
			}
		}
	]
}
```

### Capture

- Env configurations are captured by executing `envi capture`. This will traverse the current directory subfolders looking for env files, and compiles a file with the same name as the current working directory foldername. So in the root of monorepo "myproject" the resulting file will be stored as `myproject.maml`. We will assume that you will never have two projects with the same folder name that you use `envi` for, otherwise one would overwrite the stored env values of the other.
- Targeted files are expected to start with `.env`and have a second dot `.env.*` when other names are used, but these glob patterns could be made configurable later.
- Envi will use a folder global on the user’s computer to store a file with combined env contents for every repositories that it was used in. This location for MacOS can be `~/.envi/envi-store`. Windows and Linux should use similar (hidden) folders in the users’s root directory. When running `envi location`it should print the location of the repository that envi uses to store its data.
- When executing, you typically want `envi` to only run from the (mono)repo root, to prevent the user from accidentally traversing non-code folders. Envi should check if `.git` or other common version control files exist in the CWD, before attempting to capture the files. If it was not determined that CWD is the root of a codebase, we should first traverse up the folder structure, to see if we can find the root there. This allows the user to execute in a subfolder of a monorepo, and still have things work correctly. When none of the parent folders appear to be the root of a codebase, we should prompt the user to ask if they want to execute the command in the current directory (with the answer defaulting to "No").

### Restore

- Env configurations can be restored with `envi restore`. This would restore all env files in the repository by looking up each maml `files` item `path` from the current working directory, and creating a new file if needed. The file directory is expected to exist. If the directory does not exist, it should be treated as an exception, because then it’s likely that the user is trying to load a configuration that was captured in a different project.

### Comments

Comments that exist in the original env files should be preserved when capturing env configurations. Each comment is stored under key `__c[count]`, where count is an incremental zero-padded number for every line of comment that exist in the original env file.

```maml
{
  	path: "path/to/file/.env.a"
	env: {
		ENV_FOR_A_1: "value_1"
		__c00: "first comment"
		__c01: "another comment"
		ENV_FOR_A_2: "value_2"
        __c02: "last comment"
	}
}
```

### Configuration

Global configuration for envi would be stored in `~/.envi/config.maml`

There are a few things that could be configured:

- commit_changes (default false): When set to true, envi will try to use `git` to make commit change ever time `envi save` or `envi unpack` is run, and push them to origin.
- save_on_unpack (default true): When unpacking a blob, also save the configuration to the global store.

### Sharing configs with colleagues

When running `envi pack` in a codebase, we want to bundle all output of that codebase and output a blob. The blob will be an encrypted version of the data . This blob can then be shared with a colleague via something like Slack, and they can run `envi unpack [blob]` and it would inject all the environment variables in their codebase.

In order to encrypt the data, we will generate an encryption key from the contents of the package.json manifest in the repository. Then, only another user could unpack it on the same codebase (assuming no dependencies or other manifest content has been altered between both user’s branches).

This makes it pretty safe to expose the blob somewhere public or in a semi-private place with a stored history, like Slack, as long as bad-actors have no way of knowing what codebase the blob is accociated with.

The start and ending of the blob should be delimited with `__envi_start__` and `__envi_end__`. No newline characters need to be used in the blob, so it can be more easily copy/pasted in most situations.

The encryption can by default use the manifest content to define a key, but this means the blob can not be stored as a historical reference. We should allow the user to pass in their own secret, which can then be shared amoungst colleagues, so that blobs could be unpacked regardless the state of the manifest at that point. This could be `envi pack —secret [secret_string]` in combination with `envi unpack —secret [secret_string]`

After unpacking the blob, we check if the output is a valid TOML with `__envi_version` at the top.

## AI Agent Instructions

- Use PNPM to manage dependencies, and always install the latest dependencies.
- Use [enquirer](https://github.com/enquirer/enquirer) for commandline interaction
- Name the package `@codecompose/envi`
- Use tsdown to build and bundle the code
- Write vitest for testing
- Use prettier for formatting
- Use oxlint for linting
