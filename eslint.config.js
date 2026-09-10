// Flat ESLint 9 config. Deliberately short: strict typing is already enforced
// by tsconfig, so we do not restate here what `tsc` already rejects.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'tests/fixtures/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // A leading `_` marks a deliberately unused parameter.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Banned package-wide: an immediate exit truncates stdout on a pipe,
      // which makes `--format json | jq` intermittently fail. Assign
      // `process.exitCode` and let Node flush its buffers.
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'exit',
          message: 'Assign process.exitCode, never call process.exit() (stdout truncation).',
        },
      ],
    },
  },
);
