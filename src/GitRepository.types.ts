import type * as vscode from 'vscode';

/**
 * A single commit entry as reported by the built-in `vscode.git` extension API.
 * @property {string} hash - The full commit hash.
 * @property {string} message - The commit message.
 * @property {string} authorName - The name of the commit author.
 * @property {Date} commitDate - The date the commit was made.
 */
export interface GitCommit {
    hash: string;
    message: string;
    authorName?: string;
    commitDate?: Date;
}

/**
 * Minimal shape of the repository object exposed by the built-in `vscode.git` extension API
 * that DeepCommits relies on.
 * @property {vscode.Uri} rootUri - The filesystem root of the repository.
 * @property {Object} state - The current repository state.
 * @property {Object} inputBox - The Source Control input box for this repository.
 * @property {(cached?: boolean) => Promise<string>} diff - Returns the diff for staged (cached) or working tree changes.
 * @property {(message: string) => Promise<void>} commit - Commits the currently staged changes.
 * @property {(options?: { maxEntries?: number }) => Promise<GitCommit[]>} log - Returns recent commits.
 */
export interface GitApiRepository {
    rootUri: vscode.Uri;
    state: {
        indexChanges: unknown[];
        workingTreeChanges: unknown[];
        HEAD?: {
            name?: string;
        };
    };
    inputBox: {
        value: string;
    };
    diff(cached?: boolean): Promise<string>;
    commit(message: string): Promise<void>;
    log(options?: { maxEntries?: number }): Promise<GitCommit[]>;
}

/**
 * Minimal shape of the `vscode.git` extension's exported API that DeepCommits relies on.
 * @property {GitApiRepository[]} repositories - The list of Git repositories currently open in the workspace.
 */
export interface GitApi {
    repositories: GitApiRepository[];
}
