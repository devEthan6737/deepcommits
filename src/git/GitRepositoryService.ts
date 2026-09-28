import * as path from 'path';
import * as vscode from 'vscode';
import { GitCommandRunner } from './GitCommandRunner';
import { DefaultLogEntries, GitExtensionEnum } from './Git.constants';
import type { ChangedFileGroup, GitApi, GitApiRepository, GitCommit } from './GitRepository.types';

/** Directory label used for changed files that live directly at the repository root. */
const RootDirectoryLabel = '.';

/**
 * Wraps the built-in `vscode.git` extension API to expose the pieces DeepCommits needs: picking
 * the relevant repository, reading its pending diff, committing, and reading its recent history.
 */
export class GitRepositoryService {
    private readonly gitApi: GitApi;
    private readonly commandRunner: GitCommandRunner;

    /**
     * @param {GitApi} gitApi - The resolved `vscode.git` extension API.
     * @param {GitCommandRunner} commandRunner - Runs `git` commands directly for operations the API can't be trusted for.
     */
    private constructor(gitApi: GitApi, commandRunner: GitCommandRunner) {
        this.gitApi = gitApi;
        this.commandRunner = commandRunner;
    }

    /**
     * Activates the built-in Git extension if needed and creates a service bound to its API.
     *
     * @returns {Promise<GitRepositoryService>} A promise that resolves to a ready-to-use service.
     * @throws {Error} When the built-in Git extension is not available.
     */
    public static async connect(): Promise<GitRepositoryService> {
        const gitExtension = vscode.extensions.getExtension(GitExtensionEnum.Id);

        if (!gitExtension) throw new Error('The built-in Git extension is not available.');

        const exports = gitExtension.isActive ? gitExtension.exports : await gitExtension.activate();
        return new GitRepositoryService(exports.getAPI(1) as GitApi, new GitCommandRunner());
    }

    /**
     * Picks the Git repository to operate on: the one matching the active editor's document when
     * possible, otherwise the first open repository.
     *
     * @returns {GitApiRepository} The repository to generate a commit message for.
     * @throws {Error} When no Git repository is open in the current workspace.
     */
    public pickRepository(): GitApiRepository {
        if (this.gitApi.repositories.length === 0) throw new Error('No Git repository was found in the current workspace.');

        const activeUri = vscode.window.activeTextEditor?.document.uri;
        if (activeUri) {
            const match = this.gitApi.repositories.find((repo) => activeUri.fsPath.startsWith(repo.rootUri.fsPath));

            if (match) return match;
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
        if (repository.state.indexChanges.length > 0) return repository.diff(true);
        if (repository.state.workingTreeChanges.length > 0) return repository.diff(false);

        return '';
    }

    /**
     * Commits the repository's changes with the given message, by running `git commit` directly
     * rather than through the `vscode.git` extension's own commit machinery. When nothing is staged,
     * mirrors {@link getRelevantDiff}'s working tree fallback by staging all changed files before
     * committing, so the commit actually captures what the message was generated from.
     *
     * @param {GitApiRepository} repository - The repository to commit in.
     * @param {string} message - The commit message.
     * @returns {Promise<void>} A promise that resolves once the commit has been created.
     */
    public async commit(repository: GitApiRepository, message: string): Promise<void> {
        const hasStagedChanges = repository.state.indexChanges.length > 0;
        const paths = hasStagedChanges ? undefined : this.getChangedPaths(repository);
        await this.commandRunner.commit(repository.rootUri.fsPath, message, paths);
    }

    /**
     * Commits only the files in the given group, leaving any other pending changes untouched.
     *
     * @param {GitApiRepository} repository - The repository to commit in.
     * @param {string} message - The commit message.
     * @param {ChangedFileGroup} group - The group of files this commit covers.
     * @returns {Promise<void>} A promise that resolves once the commit has been created.
     */
    public async commitGroup(repository: GitApiRepository, message: string, group: ChangedFileGroup): Promise<void> {
        await this.commandRunner.commit(repository.rootUri.fsPath, message, group.paths);
    }

    /**
     * Reads the combined staged and unstaged diff for a specific group of changed files.
     *
     * @param {GitApiRepository} repository - The repository to read the diff from.
     * @param {ChangedFileGroup} group - The group of files to diff.
     * @returns {Promise<string>} A promise that resolves to the diff text for that group.
     */
    public async getDiffForGroup(repository: GitApiRepository, group: ChangedFileGroup): Promise<string> {
        return this.commandRunner.diff(repository.rootUri.fsPath, group.paths);
    }

    /**
     * Groups the repository's currently changed files (staged and unstaged) by their top-level
     * directory, so each group can be generated and committed separately.
     *
     * @param {GitApiRepository} repository - The repository to read pending changes from.
     * @returns {ChangedFileGroup[]} The changed files, grouped by top-level directory.
     */
    public getChangedFileGroups(repository: GitApiRepository): ChangedFileGroup[] {
        const groupsByDirectory = new Map<string, string[]>();

        for (const relativePath of this.getChangedPaths(repository)) {
            const directory = relativePath.includes(path.sep) ? relativePath.split(path.sep)[0] : RootDirectoryLabel;
            const paths = groupsByDirectory.get(directory) ?? [];
            paths.push(relativePath);
            groupsByDirectory.set(directory, paths);
        }

        return Array.from(groupsByDirectory, ([directory, paths]) => ({ directory, paths }));
    }

    /**
     * Reads the repository-relative paths of every currently changed file, staged or not, deduplicated.
     *
     * @param {GitApiRepository} repository - The repository to read pending changes from.
     * @returns {string[]} The repository-relative paths of the changed files.
     */
    private getChangedPaths(repository: GitApiRepository): string[] {
        const changes = [...repository.state.indexChanges, ...repository.state.workingTreeChanges];
        const relativePaths = changes.map((change) => path.relative(repository.rootUri.fsPath, change.uri.fsPath));

        return Array.from(new Set(relativePaths));
    }

    /**
     * Reads the repository's most recent commits.
     *
     * @param {GitApiRepository} repository - The repository to read history from.
     * @returns {Promise<GitCommit[]>} A promise that resolves to the recent commits, newest first.
     */
    public async getRecentCommits(repository: GitApiRepository): Promise<GitCommit[]> {
        try {
            return await repository.log({ maxEntries: DefaultLogEntries });
        } catch {
            return [];
        }
    }
}
