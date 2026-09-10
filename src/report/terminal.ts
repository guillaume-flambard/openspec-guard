import type { MatchReason } from '../types.js';
import type { CriterionResult, Report } from './types.js';

/**
 * Human-readable report.
 *
 * Groups are ordered by how actionable they are, not by severity: a dead
 * selector is a ten-second fix and belongs at the top, while five hundred
 * "no candidate" lines are a strategy decision and belong at the bottom.
 */

export interface TerminalOptions {
  color: boolean;
  verbose: boolean;
  /** Rows printed per group before truncation. The JSON is never truncated. */
  maxRowsPerGroup: number;
}

export const DEFAULT_TERMINAL_OPTIONS: TerminalOptions = {
  color: false,
  verbose: false,
  maxRowsPerGroup: 20,
};

interface Group {
  reason: MatchReason;
  label: string;
  /** Folded away unless --verbose: nothing to act on. */
  quiet: boolean;
}

const GROUPS: Group[] = [
  { reason: 'selector-unmatched', label: 'FAIL  selector matches no test', quiet: false },
  { reason: 'selector-ambiguous', label: 'FAIL  selector matches several tests', quiet: false },
  { reason: 'matched-test-skipped', label: 'FAIL  matched test is skipped', quiet: false },
  { reason: 'missing-selector', label: 'FAIL  no selector (--require-selector)', quiet: false },
  { reason: 'low-similarity', label: 'FAIL  best candidate too weak', quiet: false },
  { reason: 'no-candidate', label: 'FAIL  no candidate test (no shared word)', quiet: false },
  { reason: 'heuristic-weak', label: 'UNCERTAIN  similarity in the uncertain band', quiet: false },
  { reason: 'non-testable', label: 'SKIP  declared not testable', quiet: true },
  { reason: 'selector', label: 'PASS  linked by selector', quiet: true },
  { reason: 'heuristic', label: 'PASS  linked by similarity', quiet: true },
];

const COLORS: Partial<Record<MatchReason, string>> = {
  selector: '32',
  heuristic: '32',
  'heuristic-weak': '33',
  'non-testable': '36',
};

function paint(text: string, code: string | undefined, enabled: boolean): string {
  if (!enabled || code === undefined) return text;
  return `\u001B[${code}m${text}\u001B[0m`;
}

function pad(text: string, width: number): string {
  return text.length >= width ? text : text + ' '.repeat(width - text.length);
}

function formatScore(score: number): string {
  return score.toFixed(2);
}

function rowsOf(result: CriterionResult): string[] {
  const location = `${result.source.file}:${result.source.line}`;
  const head = `  ${pad(result.capability, 24)} ${result.scenario}`;
  const rows = [`${head}  (${location})`];

  if (result.selector !== null && result.match.test === null) {
    rows.push(`      selector: ${JSON.stringify(result.selector)}`);
  }
  if (result.nonTestableReason !== null) {
    rows.push(`      reason: ${result.nonTestableReason}`);
  }
  if (result.match.test) {
    const test = result.match.test;
    const score = result.reason.startsWith('selector')
      ? 'selector'
      : `score ${formatScore(result.match.score)}`;
    rows.push(`      ${score} -> ${test.fullName}  (${test.file}:${test.line})`);
  }
  for (const runnerUp of result.match.runnersUp) {
    rows.push(`      also: ${runnerUp.fullName}  (${runnerUp.file}:${runnerUp.line})`);
  }
  return rows;
}

function headerOf(report: Report): string[] {
  const { input } = report;
  return [
    `openspec-guard ${report.tool.version}`,
    `  specs   ${input.specRoot}  (${input.specFileCount} files, ${report.summary.total} criteria)`,
    `  code    ${input.codeRoot}  (${input.testFileCount} test files, ` +
      `${input.testTitleCount} titles)`,
    `  runner  ${input.runner}${
      input.runnerEvidence.length > 0 ? `  [${input.runnerEvidence.join(', ')}]` : ''
    }`,
    '',
  ];
}

function summaryLine(report: Report): string {
  const { summary } = report;
  const split =
    summary.pass > 0
      ? ` (${summary.passBySelector} by selector, ${summary.passByHeuristic} by similarity)`
      : '';
  const frozen =
    summary.baselined > 0 ? `, ${summary.baselined} of them frozen by the baseline` : '';
  return (
    `${summary.total} criteria: ${summary.pass} pass${split}, ` +
    `${summary.uncertain} uncertain, ${summary.fail} fail, ${summary.skip} skip${frozen}`
  );
}

/**
 * Printed once, and only when similarity provably did nothing on a repository
 * that does have tests and no selectors at all. It describes the algorithm; it
 * is not an excuse.
 */
function languageNotice(report: Report): string[] {
  const usesSelectors = report.results.some((result) => result.selector !== null);
  const shouldWarn =
    report.options.heuristic &&
    report.summary.passByHeuristic === 0 &&
    !usesSelectors &&
    report.input.testTitleCount > 0 &&
    report.summary.total > 0;

  if (!shouldWarn) return [];

  return [
    '',
    'No criterion was linked by similarity on this repository.',
    'Similarity compares words, it does not translate them: scenarios written in one',
    'language and test titles written in another cannot meet. To link a scenario to a',
    'test, add <!-- openspec-guard:test="exact test title" --> under its heading.',
  ];
}

export function renderTerminal(report: Report, options: TerminalOptions): string {
  const lines: string[] = [...headerOf(report)];

  // Baselined criteria are frozen debt. They are counted, never listed among
  // the things to act on, or the report is back to being a wall of red.
  const byReason = new Map<MatchReason, CriterionResult[]>();
  for (const result of report.results) {
    if (result.baselined) continue;
    const bucket = byReason.get(result.reason);
    if (bucket) bucket.push(result);
    else byReason.set(result.reason, [result]);
  }

  for (const group of GROUPS) {
    const results = byReason.get(group.reason);
    if (!results || results.length === 0) continue;

    const label = paint(`${group.label}  (${results.length})`, COLORS[group.reason], options.color);

    if (group.quiet && !options.verbose) {
      lines.push(label, '');
      continue;
    }

    lines.push(label);
    const limit = options.verbose ? results.length : options.maxRowsPerGroup;
    for (const result of results.slice(0, limit)) lines.push(...rowsOf(result));
    if (results.length > limit) {
      lines.push(`  ... and ${results.length - limit} more (--verbose)`);
    }
    lines.push('');
  }

  lines.push(summaryLine(report));

  const stale = report.diagnostics.staleBaselineEntries.length;
  if (stale > 0) {
    lines.push(
      `${stale} baseline entr${stale === 1 ? 'y matches' : 'ies match'} nothing any more ` +
        '(fixed, rewritten or deleted). Prune with --update-baseline.',
    );
  }

  if (report.diagnostics.dynamicTitles.length > 0) {
    lines.push(
      `${report.diagnostics.dynamicTitles.length} test title(s) could not be read statically ` +
        'and are invisible to matching (see diagnostics in --format json).',
    );
  }
  if (report.diagnostics.unparsedFiles.length > 0) {
    lines.push(`${report.diagnostics.unparsedFiles.length} test file(s) failed to parse.`);
  }

  lines.push(...languageNotice(report));

  if (!report.gates.passed) {
    lines.push('');
    for (const violation of report.gates.violations) {
      lines.push(paint(`gate: ${violation}`, options.color ? '31' : undefined, options.color));
    }
  }

  return `${lines.join('\n')}\n`;
}
