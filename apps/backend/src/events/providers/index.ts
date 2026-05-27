import { GitHubEventProvider } from './github-provider';

export function registerDefaultEventProviders(registry: {
  register: (provider: GitHubEventProvider) => unknown;
}): void {
  registry.register(new GitHubEventProvider());
}

export { GitHubEventProvider } from './github-provider';
