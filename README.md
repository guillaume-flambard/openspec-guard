# OpenSpec Guard

Answers one question about a repository, deterministically: **which OpenSpec
scenarios are covered by a test?**

It reads your specs and the titles of your Vitest or Jest tests. It never runs
the tests, never imports your code, and never calls an LLM. The same input
always produces the same bytes.

```bash
npx openopenspec-guard check
```

## Link a scenario to a test

The primary mechanism is an explicit selector. Put it directly under the
scenario heading, as an HTML comment:

```md
#### Scenario: Sign up with a valid email

<!-- openspec-guard:test="creates a user with a valid email" -->

- **WHEN** a visitor submits a valid email
- **THEN** the system creates the user
```

The selector is compared, exactly, against the test's leaf title and against
its full name. Use the full name when a title occurs more than once:

```md
<!-- openspec-guard:test="signup > empty field" -->
```

For a scenario that no automated test can cover, say so and say why:

```md
#### Scenario: Manual compliance sign-off

<!-- openspec-guard:non-testable reason="Requires a human legal assessment" -->
```

The two directives are mutually exclusive, and `non-testable` requires a
non-empty reason. That reason is what keeps a skipped criterion auditable.

> These annotations are a **OpenSpec Guard convention, not OpenSpec syntax**. They
> are HTML comments on purpose: the official OpenSpec parser treats every `####`
> heading as a scenario, so a `#### OpenSpec Guard metadata` block would silently
> become a bogus scenario. A comment cannot.

## What similarity can and cannot do

When a scenario has no selector, OpenSpec Guard falls back to a Jaccard score over
significant words. Be clear about what that is:

**It compares words. It does not translate them.** French and English stopwords
are merged so both languages are _cleaned_ the same way, but `changer` never
becomes `change`, and `langue` never becomes `language`. A scenario written in
one language and a test title written in another share tokens only by lexical
accident, and a two-word accident is exactly the false positive a compliance
tool must not produce.

So: **the explicit selector is the mechanism, similarity is a convenience** for
repositories whose specs and tests are written in the same language. On a
bilingual repository, run with `--require-selector` and get an honest report
instead of a wall of near-zero scores.

The report always separates the asserted from the guessed:

```
84 criteria: 12 pass (11 by selector, 1 by similarity), 3 uncertain, 68 fail, 1 skip
```

## Verdicts and reasons

Four verdicts, and a reason that says what to do about it.

| Verdict     | Reason                 | What it means                                       |
| ----------- | ---------------------- | --------------------------------------------------- |
| `pass`      | `selector`             | Linked by an explicit selector                      |
| `pass`      | `heuristic`            | Linked by similarity above the threshold            |
| `uncertain` | `heuristic-weak`       | A candidate exists, the score is in the middle band |
| `fail`      | `selector-unmatched`   | The selector points at a title that does not exist  |
| `fail`      | `selector-ambiguous`   | The selector matches several tests                  |
| `fail`      | `matched-test-skipped` | The matched test is skipped                         |
| `fail`      | `low-similarity`       | A candidate was seen, and is too weak to claim      |
| `fail`      | `no-candidate`         | No significant word shared with any test title      |
| `fail`      | `missing-selector`     | `--require-selector` and no selector here           |
| `skip`      | `non-testable`         | Declared not testable, with a reason                |

A skipped test never counts as coverage. `it.skip` is exactly the state
OpenSpec Guard exists to reveal, so it produces `fail`, never `skip`.

## Exit codes

| Code | Meaning                                                   |
| ---- | --------------------------------------------------------- |
| `0`  | Success                                                   |
| `1`  | A gate was violated, and nothing else                     |
| `2`  | The input or an option is at fault                        |
| `3`  | An internal error: a OpenSpec Guard bug, please report it |

`2` and `3` are kept apart on purpose. A `2` is your input; a `3` is our bug.
Collapsing them turns every regression of this tool into a hunt for an innocent
spec file.

By default a run exits `0` even with failures: it reports, it does not judge.
Gates are opt-in.

```bash
openspec-guard check --fail-on fail,uncertain
openspec-guard check --min-pass 40
```

Both gates apply together, and both violations are reported when both break.

## In CI

```yaml
- name: Spec coverage
  run: npx openopenspec-guard check --fail-on fail,uncertain
```

Start without a gate, read the report, add selectors, then turn the gate on.
Turning it on first only teaches the team to pass `--allow-empty`.

## Options

```
openspec-guard check [options]

Discovery
  --cwd <dir>              Working directory (default: the current one)
  --specs <dir>            Spec root (default: openspec/specs, else specs)
  --code <dir>             Code root (default: --cwd)
  --tests <glob>           Test file glob, repeatable
  --runner vitest|jest     Skip runner detection
  --include-changes        Also read delta specs under openspec/changes
  --allow-empty            Succeed on a spec root that holds no spec.md

Matching
  --require-selector       Turn similarity off; only explicit selectors link
  --pass-threshold <n>     Similarity needed to pass (default: 0.6)
  --uncertain-threshold <n>  Similarity needed to be uncertain (default: 0.25)
  --min-shared-terms <n>   Shared words needed to pass (default: 2)

Output
  --format terminal|json   Report format (default: terminal)
  --verbose                Print every row, including passes and skips
  --no-color               Never emit ANSI colour
  --max-rows <n>           Rows per group before truncation (default: 20)

Gates
  --fail-on <list>         Verdicts that must not appear
  --min-pass <n>           Minimum number of passing criteria
```

`--tests` matters in a repository where `*.spec.ts` also means Playwright: a
default run collects those titles too, and they pollute the index.

## The JSON report

`--format json` writes the document to stdout and nothing else; every
human-facing line goes to stderr. So this is exactly the document:

```bash
openspec-guard check --format json > coverage.json
```

Its guarantees are part of the contract, not an implementation detail:

- no timestamp, no duration, no absolute path, no machine name, anywhere;
- every path relative to the working directory, POSIX separators;
- `results` sorted by file, then line, then id;
- arrays always present, absent scalars always `null` and never omitted, so a
  diff between two reports stays readable;
- scores rounded to four decimals.

Two runs on the same input produce identical bytes. That is what makes the
report diffable in CI.

Each criterion carries a stable id, `sg_` plus 16 hex characters, derived from
the file path, the requirement name, and the normalized scenario text. Adding
or removing an annotation does not move it. Editing the scenario body does:
that is the correct signal for "the spec changed", and it means ids are not
permanent identifiers. Do not build a suppression file on them yet.

## What it does not do

Not in this version: `node:test`, spec formats other than OpenSpec, a baseline
file, per-package scoping in a monorepo, `.gitignore` awareness, stemming or
translation, expanding `.each` tables, watch mode, SARIF, and any reading of a
test **body**.

OpenSpec Guard matches titles. It never reads an assertion, so it cannot tell you
whether a test is any good, only whether one exists.

## Programmatic use

```ts
import { runCheck, renderJson } from 'openspec-guard';

const { report, exitCode } = await runCheck({
  cwd: process.env.GITHUB_WORKSPACE ?? process.cwd(),
  failOn: ['fail'],
});
```

`cwd` is a parameter, never read from the ambient process inside the library.

## Requirements

Node 20.11 or later.

## A note on the name

There is an unrelated package called `specguard`, one word, published on npm in
February 2026. This one is `openspec-guard`, named after the spec format it
reads and after the `openspec-*` convention the rest of that ecosystem already
uses. Different package, different binary, no overlap.

```bash
npx openspec-guard check      # no install
pnpm add -D openspec-guard    # then: pnpm openspec-guard check
```

## License

MIT. Published by Memo Labs (Guillaume Flambard).
