import { describe, expect, it } from 'vitest';

import type { MatchReason, Verdict } from './types.js';
import { ALL_REASONS, decideVerdict, evaluateGates, summarize, type Summary } from './verdict.js';

const EXPECTED: Record<MatchReason, Verdict> = {
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

describe('decideVerdict', () => {
  // This assertion is the point of the test: it fails the day a reason is
  // added to the enum without a decision being made for it here.
  it('covers every reason, and no more', () => {
    expect([...ALL_REASONS].sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  for (const [reason, verdict] of Object.entries(EXPECTED) as [MatchReason, Verdict][]) {
    it(`maps ${reason} to ${verdict}`, () => {
      expect(decideVerdict(reason)).toBe(verdict);
    });
  }

  it('reserves skip for non-testable, never for a skipped test', () => {
    expect(decideVerdict('matched-test-skipped')).toBe('fail');
    expect(decideVerdict('non-testable')).toBe('skip');
  });
});

describe('summarize', () => {
  it('counts verdicts and splits pass by how it was earned', () => {
    const summary = summarize([
      { verdict: 'pass', reason: 'selector' },
      { verdict: 'pass', reason: 'selector' },
      { verdict: 'pass', reason: 'heuristic' },
      { verdict: 'uncertain', reason: 'heuristic-weak' },
      { verdict: 'fail', reason: 'no-candidate' },
      { verdict: 'fail', reason: 'low-similarity' },
      { verdict: 'fail', reason: 'selector-unmatched' },
      { verdict: 'fail', reason: 'selector-ambiguous' },
      { verdict: 'fail', reason: 'matched-test-skipped' },
      { verdict: 'fail', reason: 'missing-selector' },
      { verdict: 'skip', reason: 'non-testable' },
    ]);

    expect(summary).toEqual<Summary>({
      total: 11,
      pass: 3,
      uncertain: 1,
      fail: 6,
      skip: 1,
      baselined: 0,
      passBySelector: 2,
      passByHeuristic: 1,
      failNoCandidate: 1,
      failLowSimilarity: 1,
      failSelectorUnmatched: 1,
      failSelectorAmbiguous: 1,
      failSkippedTest: 1,
      failMissingSelector: 1,
    });
  });

  it('counts baselined outcomes without changing their verdict', () => {
    const summary = summarize([
      { verdict: 'fail', reason: 'no-candidate', baselined: true },
      { verdict: 'fail', reason: 'no-candidate' },
    ]);
    expect(summary.fail).toBe(2);
    expect(summary.baselined).toBe(1);
  });

  it('always has passBySelector plus passByHeuristic equal to pass', () => {
    const summary = summarize([
      { verdict: 'pass', reason: 'selector' },
      { verdict: 'pass', reason: 'heuristic' },
    ]);
    expect(summary.passBySelector + summary.passByHeuristic).toBe(summary.pass);
  });
});

function summaryOf(partial: Partial<Summary>): Summary {
  return { ...summarize([]), ...partial };
}

describe('evaluateGates', () => {
  it('passes when no gate is set', () => {
    expect(evaluateGates(summaryOf({ fail: 5 }), { failOn: [], minPass: null })).toEqual({
      passed: true,
      violations: [],
    });
  });

  it('fails on a forbidden verdict', () => {
    const result = evaluateGates(summaryOf({ fail: 3 }), { failOn: ['fail'], minPass: null });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual(["3 criteria with verdict 'fail', forbidden by --fail-on"]);
  });

  it('ignores a forbidden verdict that does not occur', () => {
    expect(
      evaluateGates(summaryOf({ fail: 0, uncertain: 0 }), {
        failOn: ['fail', 'uncertain'],
        minPass: null,
      }).passed,
    ).toBe(true);
  });

  it('fails when min-pass is not reached', () => {
    const result = evaluateGates(summaryOf({ pass: 4 }), { failOn: [], minPass: 5 });
    expect(result.violations).toEqual(['4 pass, --min-pass requires at least 5']);
  });

  it('reports both violations when both gates are broken', () => {
    const result = evaluateGates(summaryOf({ pass: 1, fail: 2 }), {
      failOn: ['fail'],
      minPass: 5,
    });
    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(2);
  });
});
