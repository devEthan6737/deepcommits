/** Identifier of VS Code's built-in Git extension, whose API DeepCommits reuses. */
export enum GitExtensionEnum {
    Id = 'vscode.git'
}

/** The `git` CLI binary and the subcommands/flags DeepCommits invokes on it directly. */
export enum GitCliEnum {
    Binary = 'git',
    CommitSubcommand = 'commit',
    AddSubcommand = 'add',
    DiffSubcommand = 'diff',
    MessageFlag = '-m',
    CachedFlag = '--cached',
    PathsSeparator = '--'
}

/** Default number of recent commits shown in the DeepCommits panel. */
export const DefaultLogEntries = 8;
