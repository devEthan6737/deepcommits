import type { DeepCommitsSettings } from '../config/Config.types';
import type { DeepSeekClient } from '../deepseek/DeepSeekClient';
import type { GitApiRepository } from '../git/GitRepository.types';
import type { GitRepositoryService } from '../git/GitRepositoryService';

/** Label of the action button shown in the commit confirmation dialog. */
export enum ConfirmActionEnum {
    Commit = 'Commit'
}

/**
 * The dependencies and resolved settings an {@link AutoCommitService} run needs to generate and
 * commit, grouped into a single object so they can be threaded through as one parameter.
 * @property {GitRepositoryService} gitRepositoryService - Reads and writes the repository's changes.
 * @property {GitApiRepository} repository - The repository being committed to.
 * @property {DeepSeekClient} client - Generates commit messages from a diff.
 * @property {DeepCommitsSettings} settings - The resolved DeepCommits settings for this run.
 */
export interface AutoCommitContext {
    gitRepositoryService: GitRepositoryService;
    repository: GitApiRepository;
    client: DeepSeekClient;
    settings: DeepCommitsSettings;
}
