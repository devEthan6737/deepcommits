import * as vscode from 'vscode';

/**
 * Minimal shape of the repository object exposed by the built-in `vscode.git` extension API
 * that DeepCommits relies on.
 * @property {Object} state - The current repository state.
 * @property {Object} inputBox - The Source Control input box for this repository.
 * @property {(ref?: string) => Promise<string>} diff - Returns the diff for the given ref (or staged changes when omitted).
 */
interface GitApiRepository {
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
interface GitApi {
  repositories: GitApiRepository[];
}

/**
 * Resolves the active `vscode.git` extension API, activating the extension if necessary.
 *
 * @returns {Promise<GitApi>} A promise that resolves to the Git extension's API surface.
 */
export async function getGitApi(): Promise<GitApi> {
  const gitExtension = vscode.extensions.getExtension('vscode.git');

  if (!gitExtension) {
    throw new Error('The built-in Git extension is not available.');
  }

  const exports = gitExtension.isActive ? gitExtension.exports : await gitExtension.activate();
  return exports.getAPI(1) as GitApi;
}

/**
 * Picks the Git repository to operate on: the one matching the active editor's document when
 * possible, otherwise the first open repository.
 *
 * @param {GitApi} gitApi - The resolved `vscode.git` extension API.
 * @returns {GitApiRepository} The repository to generate a commit message for.
 */
export function pickRepository(gitApi: GitApi): GitApiRepository {
  if (gitApi.repositories.length === 0) {
    throw new Error('No Git repository was found in the current workspace.');
  }

  const activeUri = vscode.window.activeTextEditor?.document.uri;
  if (activeUri) {
    const match = gitApi.repositories.find((repo) => activeUri.fsPath.startsWith(repo.rootUri.fsPath));
    if (match) {
      return match;
    }
  }

  return gitApi.repositories[0];
}

/**
 * Retrieves the diff for the repository's staged changes, falling back to the working tree diff
 * when nothing is staged.
 *
 * @param {GitApiRepository} repository - The repository to read the diff from.
 * @returns {Promise<string>} A promise that resolves to the diff text, or an empty string if there are no changes.
 */
export async function getRelevantDiff(repository: GitApiRepository): Promise<string> {
  if (repository.state.indexChanges.length > 0) {
    return repository.diff(true);
  }

  if (repository.state.workingTreeChanges.length > 0) {
    return repository.diff(false);
  }

  return '';
}
