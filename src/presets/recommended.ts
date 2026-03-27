import type { PromptocopConfig } from '../types.js';

export const recommended: PromptocopConfig = {
  rules: {
    'no-vague-verb': 'error',
    'no-ambiguous-pronoun': 'error',
    'missing-success-criteria': 'error',
    'no-file-context': 'warn',
    'no-constraints': 'warn',
    'multi-task': 'error',
    'context-dump-risk': 'warn',
    'prefer-example': 'info',
  },
};
