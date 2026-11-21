import type { Project } from '../../src/lib/schema';

export function entry(over: Partial<Project> = {}): Project {
  const base: Project = {
    slug: 'alpha', repo: 'example-org/alpha', order: 1,
    portfolio: {
      name: 'alpha', pitch: 'A fixture.', stack: ['python'], tests: 10, release: 'v1.0.0', released_on: '2026-01-02',
      demo_url: 'https://example.org/demo', repo_url: 'https://github.com/example-org/alpha', example_pr_url: 'https://github.com/example-org/alpha/pull/1',
    },
    headline: { value: '10', label: 'tests pass', n: null, kind: 'tests', source_url: 'https://github.com/example-org/alpha/blob/v1.0.0/README.md' },
    sessions: 3,
    models: [{ name: 'Model A / high', sessions: 3 }],
  };
  return structuredClone({ ...base, ...over });
}
