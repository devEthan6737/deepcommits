import { execFile } from 'child_process';
import { GitCliEnum } from './Git.constants';

/**
 * Runs `git` commands directly via a child process, instead of going through the built-in
 * `vscode.git` extension's own commit machinery, which can fail independently if that
 * extension's `git.path` setting is misconfigured.
 */
export class GitCommandRunner {
    /**
     * Commits changes in the given repository.
     *
     * @param {string} repositoryPath - The filesystem path of the repository root.
     * @param {string} message - The commit message.
     * @param {boolean} stageAllTracked - When true, passes `--all` so tracked, modified files are staged and
     * committed even if nothing was staged beforehand (used when the message was generated from the working
     * tree diff rather than the index).
     * @returns {Promise<void>} A promise that resolves once the commit has been created.
     * @throws {Error} When the `git` binary is not found, or the commit fails (e.g. nothing to commit).
     */
    public commit(repositoryPath: string, message: string, stageAllTracked: boolean): Promise<void> {
        const args = [GitCliEnum.CommitSubcommand, GitCliEnum.MessageFlag, message];
        if (stageAllTracked) args.push(GitCliEnum.AllFlag);

        return new Promise((resolve, reject) => {
            execFile(GitCliEnum.Binary, args, { cwd: repositoryPath }, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(stderr.trim() || stdout.trim() || error.message));
                    return;
                }
                resolve();
            });
        });
    }
}
