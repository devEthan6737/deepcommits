import type * as vscode from 'vscode';

/**
 * Minimal shape of the repository object exposed by the built-in `vscode.git` extension API
 * that DeepCommits relies on.
 * @property {vscode.Uri} rootUri - The filesystem root of the repository.
 * @property {Object} state - The current repository state.
 * @property {Object} inputBox - The Source Control input box for this repository.
 * @property {(cached?: boolean) => Promise<string>} diff - Returns the diff for staged (cached) or working tree changes.
 */
export interface GitApiRepository {
    rootUri: vscode.Uri;
    state: {
        indexChanges: unknown[];
        workingTreeChanges: unknown[];
    };
    inputBox: {
        value: string;
    };
    diff(cached?: boolean): Promise<string>;
}

/**
 * Minimal shape of the `vscode.git` extension's exported API that DeepCommits relies on.
 * @property {GitApiRepository[]} repositories - The list of Git repositories currently open in the workspace.
 */
export interface GitApi {
    repositories: GitApiRepository[];
}
