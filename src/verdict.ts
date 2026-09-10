import type { MatchReason, Verdict } from './types.js';

/**
 * Reason to verdict, and the gates.
 *
 * One table, tested exhaustively. `skip` is reserved for `non-testable`: a
 * skipped test is never a skipped criterion, it is a failure with a name.
 */

const VERDICTS: Record<MatchReason, Verdict> = {
  'non-testable': 'skip',
  selector: 'pass',
  heuristic: 'pass',
  'heuristic-weak': 'uncertain',
  'selector-unmatched': 'fail',
  'selector-ambiguous': 'fail',
  'matched-test-skipped': 'fail',
  'low-similarity': 'fail',
  'no-candidate': 'fail',
  'missing-selector': 'fail',
};

export const ALL_REASONS = Object.keys(VERDICTS) as MatchReason[];

export function decideVerdict(reason: MatchReason): Verdict {
  return VERDICTS[reason];
}

export interface CriterionOutcome {
  verdict: Verdict;
  reason: MatchReason;
  /** Suppressed by the baseline: known debt, not a new regression. */
  baselined?: boolean;
}

export interface Summary {
  total: number;
  pass: number;
  uncertain: number;
  fail: number;
  skip: number;
  /** Criteria a baseline is holding back. Gates ignore these. */
  baselined: number;
  /** Splits the asserted from the guessed. A pass earned by selector and a
   *  pass earned by similarity are not worth the same thing. */
  passBySelector: number;
  passByHeuristic: number;
  failNoCandidate: number;
  failLowSimilarity: number;
  failSelectorUnmatched: number;
  failSelectorAmbiguous: number;
  failSkippedTest: number;
  failMissingSelector: number;
}

export function summarize(outcomes: readonly CriterionOutcome[]): Summary {
  const summary: Summary = {
    total: outcomes.length,
    pass: 0,
    uncertain: 0,
    fail: 0,
    skip: 0,
    baselined: 0,
    passBySelector: 0,
    passByHeuristic: 0,
    failNoCandidate: 0,
    failLowSimilarity: 0,
    failSelectorUnmatched: 0,
    failSelectorAmbiguous: 0,
    failSkippedTest: 0,
    failMissingSelector: 0,
  };

  for (const outcome of outcomes) {
    summary[outcome.verdict] += 1;
    if (outcome.baselined === true) summary.baselined += 1;
    switch (outcome.reason) {
      case 'selector':
        summary.passBySelector += 1;
        break;
      case 'heuristic':
        summary.passByHeuristic += 1;
        break;
      case 'no-candidate':
        summary.failNoCandidate += 1;
        break;
      case 'low-similarity':
        summary.failLowSimilarity += 1;
        break;
      case 'selector-unmatched':
        summary.failSelectorUnmatched += 1;
        break;
      case 'selector-ambiguous':
        summary.failSelectorAmbiguous += 1;
        break;
      case 'matched-test-skipped':
        summary.failSkippedTest += 1;
        break;
      case 'missing-selector':
        summary.failMissingSelector += 1;
        break;
      case 'heuristic-weak':
      case 'non-testable':
        break;
    }
  }

  return summary;
}

export interface Gates {
  /** Verdicts that must not appear. Empty means no gate. */
  failOn: Verdict[];
  /** Minimum number of `pass`. `null` means no gate. */
  minPass: number | null;
}

export interface GateResult {
  passed: boolean;
  violations: string[];
}

/** Both gates apply. If both are violated, both are reported. */
export function evaluateGates(summary: Summary, gates: Gates): GateResult {
  const violations: string[] = [];

  for (const verdict of gates.failOn) {
    const count = summary[verdict];
    if (count > 0) {
      violations.push(`${count} criteria with verdict '${verdict}', forbidden by --fail-on`);
    }
  }

  if (gates.minPass !== null && summary.pass < gates.minPass) {
    violations.push(`${summary.pass} pass, --min-pass requires at least ${gates.minPass}`);
  }

  return { passed: violations.length === 0, violations };
}
