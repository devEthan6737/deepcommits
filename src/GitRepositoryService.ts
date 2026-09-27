import * as vscode from 'vscode';
import type { GitApi, GitApiRepository } from './GitRepository.types';

/**
 * Wraps the built-in `vscode.git` extension API to expose the pieces DeepCommits needs: picking
 * the relevant repository and reading its pending diff.
 */
export class GitRepositoryService {
    private readonly gitApi: GitApi;

    /**
     * @param {GitApi} gitApi - The resolved `vscode.git` extension API.
     */
    private constructor(gitApi: GitApi) {
        this.gitApi = gitApi;
    }

    /**
     * Activates the built-in Git extension if needed and creates a service bound to its API.
     *
     * @returns {Promise<GitRepositoryService>} A promise that resolves to a ready-to-use service.
     * @throws {Error} When the built-in Git extension is not available.
     */
    public static async connect(): Promise<GitRepositoryService> {
        const gitExtension = vscode.extensions.getExtension('vscode.git');

        if (!gitExtension) {
            throw new Error('The built-in Git extension is not available.');
        }

        const exports = gitExtension.isActive ? gitExtension.exports : await gitExtension.activate();
        return new GitRepositoryService(exports.getAPI(1) as GitApi);
    }

    /**
     * Picks the Git repository to operate on: the one matching the active editor's document when
     * possible, otherwise the first open repository.
     *
     * @returns {GitApiRepository} The repository to generate a commit message for.
     * @throws {Error} When no Git repository is open in the current workspace.
     */
    public pickRepository(): GitApiRepository {
        if (this.gitApi.repositories.length === 0) {
            throw new Error('No Git repository was found in the current workspace.');
        }

        const activeUri = vscode.window.activeTextEditor?.document.uri;
        if (activeUri) {
            const match = this.gitApi.repositories.find((repo) => activeUri.fsPath.startsWith(repo.rootUri.fsPath));
            if (match) {
                return match;
            }
        }

        return this.gitApi.repositories[0];
    }

    /**
     * Retrieves the diff for the repository's staged changes, falling back to the working tree diff
     * when nothing is staged.
     *
     * @param {GitApiRepository} repository - The repository to read the diff from.
     * @returns {Promise<string>} A promise that resolves to the diff text, or an empty string if there are no changes.
     */
    public async getRelevantDiff(repository: GitApiRepository): Promise<string> {
        if (repository.state.indexChanges.length > 0) {
            return repository.diff(true);
        }

        if (repository.state.workingTreeChanges.length > 0) {
            return repository.diff(false);
        }

        return '';
    }
}
