import { execFile } from 'child_process';
import { GitCliEnum } from './Git.constants';

/**
 * Runs `git` commands directly via a child process, instead of going through the built-in
 * `vscode.git` extension's own commit machinery, which can fail independently if that
 * extension's `git.path` setting is misconfigured.
 */
export class GitCommandRunner {
    /**
     * Stages the given paths, including untracked files.
     *
     * @param {string} repositoryPath - The filesystem path of the repository root.
     * @param {string[]} paths - The repository-relative paths to stage.
     * @returns {Promise<void>} A promise that resolves once the paths have been staged.
     * @throws {Error} When the `git` binary is not found or staging fails.
     */
    public async add(repositoryPath: string, paths: string[]): Promise<void> {
        await this.run(repositoryPath, [GitCliEnum.AddSubcommand, GitCliEnum.PathsSeparator, ...paths]);
    }

    /**
     * Commits changes in the given repository.
     *
     * @param {string} repositoryPath - The filesystem path of the repository root.
     * @param {string} message - The commit message.
     * @param {string[]} paths - When given, the paths to stage and restrict the commit to (so unrelated
     * staged changes belonging to a different group are left untouched); when omitted, commits whatever
     * is already staged.
     * @returns {Promise<void>} A promise that resolves once the commit has been created.
     * @throws {Error} When the `git` binary is not found, or the commit fails (e.g. nothing to commit).
     */
    public async commit(repositoryPath: string, message: string, paths?: string[]): Promise<void> {
        if (paths && paths.length > 0) await this.add(repositoryPath, paths);

        const args = [GitCliEnum.CommitSubcommand, GitCliEnum.MessageFlag, message];
        if (paths && paths.length > 0) {
            args.push(GitCliEnum.PathsSeparator, ...paths);
        }

        await this.run(repositoryPath, args);
    }

    /**
     * Reads the combined staged and unstaged diff for the given paths.
     *
     * @param {string} repositoryPath - The filesystem path of the repository root.
     * @param {string[]} paths - The repository-relative paths to diff.
     * @returns {Promise<string>} A promise that resolves to the concatenated staged and unstaged diff text.
     * @throws {Error} When the `git` binary is not found or the diff fails.
     */
    public async diff(repositoryPath: string, paths: string[]): Promise<string> {
        const pathArgs = [GitCliEnum.PathsSeparator, ...paths];
        const [staged, unstaged] = await Promise.all([
            this.run(repositoryPath, [GitCliEnum.DiffSubcommand, GitCliEnum.CachedFlag, ...pathArgs]),
            this.run(repositoryPath, [GitCliEnum.DiffSubcommand, ...pathArgs])
        ]);

        return [staged, unstaged].filter(Boolean).join('\n');
    }

    /**
     * Runs a `git` subcommand and resolves with its standard output.
     *
     * @param {string} repositoryPath - The filesystem path of the repository root.
     * @param {string[]} args - The `git` arguments to run.
     * @returns {Promise<string>} A promise that resolves to the command's trimmed standard output.
     * @throws {Error} When the `git` binary is not found or the command exits with a non-zero status.
     */
    private run(repositoryPath: string, args: string[]): Promise<string> {
        return new Promise((resolve, reject) => {
            execFile(GitCliEnum.Binary, args, { cwd: repositoryPath }, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(stderr.trim() || stdout.trim() || error.message));
                    return;
                }
                resolve(stdout.trim());
            });
        });
    }
}
