import { createRequire } from 'node:module';

/**
 * The published version, read from the package manifest.
 *
 * It is deliberately the only value in the JSON report that can change without
 * the input changing, and it only moves when a release is cut. Everything else
 * in the report is a function of the repository being checked.
 */
const require = createRequire(import.meta.url);

interface Manifest {
  version?: unknown;
}

function read(): string {
  try {
    // From `dist/version.js`, the manifest sits one directory up. Same from
    // `src/version.ts` during development.
    const manifest = require('../package.json') as Manifest;
    return typeof manifest.version === 'string' ? manifest.version : '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export const VERSION: string = read();
