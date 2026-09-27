import { execFile } from 'child_process';
import { GitCliEnum } from './Git.constants';

/**
 * Runs `git` commands directly via a child process, instead of going through the built-in
 * `vscode.git` extension's own commit machinery, which can fail independently if that
 * extension's `git.path` setting is misconfigured.
 */
export class GitCommandRunner {
    /**
     * Commits the currently staged changes in the given repository.
     *
     * @param {string} repositoryPath - The filesystem path of the repository root.
     * @param {string} message - The commit message.
     * @returns {Promise<void>} A promise that resolves once the commit has been created.
     * @throws {Error} When the `git` binary is not found, or the commit fails (e.g. nothing staged).
     */
    public commit(repositoryPath: string, message: string): Promise<void> {
        return new Promise((resolve, reject) => {
            execFile(
                GitCliEnum.Binary,
                [GitCliEnum.CommitSubcommand, GitCliEnum.MessageFlag, message],
                { cwd: repositoryPath },
                (error, stdout, stderr) => {
                    if (error) {
                        reject(new Error(stderr.trim() || stdout.trim() || error.message));
                        return;
                    }
                    resolve();
                }
            );
        });
    }
}
