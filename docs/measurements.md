# What similarity actually does, measured

Numbers below come from running the built CLI against real OpenSpec
repositories on 2026-09-10, with default options and no annotations anywhere.
No spec content from those repositories is reproduced here or in the fixtures;
only aggregate counts and a few illustrative title pairs.

## Two repositories, two very different answers

| Repository           | Spec language | Criteria | pass | uncertain | fail | no candidate | low similarity |
| -------------------- | ------------- | -------: | ---: | --------: | ---: | -----------: | -------------: |
| Bilingual monorepo   | French        |      536 |    2 |        52 |  482 |          268 |            214 |
| Single-language repo | English       |       44 |    1 |        16 |   27 |            1 |             26 |

Both were run with 644 and 493 extracted test titles respectively, so neither
result is a matter of having no tests to match against.

## The bilingual case: similarity is inert

Specs in French, test titles in English. 482 of 536 criteria fail, and half of
those (268) share **not one significant word** with any of the 644 test titles
in the repository. That is not a tuning problem. Jaccard compares tokens, and
`{changer, langue}` and `{falls, back, unknown, language}` do not intersect.

The two passes are exactly what the model predicts: lexical accidents on words
that survive translation.

```
Scenario "Landing home"      -> test "landing home"                   score 1.00
Scenario "Messages web en CI" -> test "web messages (Maestro 08)"      score 0.67
```

The first is right. The second is right by luck, on two borrowed words.

The 52 `uncertain` are mostly noise, and they are worth reading before trusting
any middle-band score:

```
"Voir les abonnés sur le web"  -> "web recipes"        score 0.25, shared: web
"No-show, pas de remboursement" -> "does not show the count when absent"
                                                        score 0.25, shared: show
```

`show` matching `no-show` is a token collision between two languages, not a
link between a scenario and a test.

**Conclusion for a bilingual repository: run with `--require-selector`.** It
turns 482 vague failures into one actionable statement per criterion, and it
stops the report from implying a relevance it does not have.

## The single-language case: similarity works, with noise

Specs and tests both in English. The single pass is a genuine link, found
without any annotation:

```
Scenario "Keyboard moves between run tabs"
     -> test "my runs > moves between the two tabs from the keyboard"
        score 0.67, shared: keyboard, moves, between, tabs
```

Four shared significant words, and a human would draw the same line. This is
what the heuristic is for.

The 16 `uncertain` still contain real noise (`"Requesting a link"` against
`"does not link a node to itself"`, one shared word), which is why the middle
band is a verdict of its own rather than a pass.

## The third case: selectors, on a repository that had no tests at all

A Next.js application with one pure module and zero tests was given, in one
sitting, a Vitest suite and an OpenSpec capability describing the same module,
with every scenario carrying an explicit selector.

```
11 criteria: 10 pass (10 by selector, 0 by similarity), 0 uncertain, 0 fail, 1 skip
```

`--fail-on fail,uncertain` exits `0`. The one skip is a scenario about editorial
tone, declared `non-testable` with its reason, which is what keeps it auditable
rather than merely absent.

Note the second number: zero passes by similarity, on a repository where specs
and tests were written together, in the same sitting, by the same person. The
scenario titles describe behaviour ("Falls back to the email local part") and
the test titles describe the function under test ("falls back to the local part
of the email"). Even that is not reliably close enough for a 0.6 Jaccard. The
selector is not a fallback for messy repositories; it is the mechanism.

## What the baseline does to those numbers

The bilingual monorepo above is the case the baseline exists for. Measured on a
copy of it, with the built CLI:

```
openspec-guard check --fail-on fail                       -> exit 1
openspec-guard check --update-baseline                    -> 536 frozen
openspec-guard check --baseline ... --fail-on fail        -> exit 0
```

The verdicts do not change. 534 criteria still read `fail`, and the report still
says so. Only the gate looks away, and only at what was already there.

Then one scenario is added to a spec, with no test:

```
FAIL  no candidate test (no shared word)  (1)
  account/erasure   Un scenario ajoute apres le gel  (openspec/specs/account/erasure/spec.md:55)

537 criteria: 0 pass, 2 uncertain, 535 fail, 0 skip, 536 of them frozen by the baseline
gate: 1 criteria with verdict 'fail', forbidden by --fail-on
```

Exit 1, and exactly one actionable line out of 537 criteria. That is the
difference between a tool a team can adopt on a Tuesday and a tool that prints
five hundred red lines and gets uninstalled.

The frozen file is 136 kB of sorted JSON for those 536 entries, with no
timestamp, so it diffs cleanly in review.

## Five public repositories that had never heard of this tool

Everything above is measured on repositories belonging to the author, which
proves less than it looks. So: five public repositories that use OpenSpec and a
runner this tool can read, cloned and checked with default options on
2026-09-10. **8,860 criteria in total.**

| Repository                                                        | Criteria | pass | uncertain |  fail | Test titles |
| ----------------------------------------------------------------- | -------: | ---: | --------: | ----: | ----------: |
| [epam/ai-dial-chat](https://github.com/epam/ai-dial-chat)         |    6,606 |  644 |     4,342 | 1,620 |       9,059 |
| [clay-good/OpenLore](https://github.com/clay-good/OpenLore)       |    1,645 |   29 |       532 | 1,084 |       9,231 |
| [recomposesh/recompose](https://github.com/recomposesh/recompose) |      362 |   37 |       277 |    48 |      10,948 |
| [seek-oss/sku](https://github.com/seek-oss/sku)                   |      196 |   16 |       113 |    67 |         602 |
| [skill-flow/skflow](https://github.com/skill-flow/skflow)         |       51 |    5 |        29 |    17 |         101 |

Every pass there is earned by similarity and none by a selector, which says
nothing at all about those repositories: the annotation convention did not exist
when they were written. What is measured is what similarity does unaided.

### Similarity does work when the languages match

These are English specs against English tests, and unlike the bilingual case the
score finds real links: between 2 and 10 percent of criteria pass outright, and
those passes are solid. The median passing match shares **four to five**
significant words, and the weakest shares two. Across all 8,860 criteria, not one
pass looked wrong on inspection.

### The uncertain band is not noise, it is a work queue

The striking number is `uncertain`: 32 to 77 percent of criteria. The first
hypothesis was that this is single-word noise inflated by huge test suites. It is
not: only 1 to 9 percent of that band rests on one shared word.

Reading a random sample tells a better story. About half of them are the right
test, sitting below the pass threshold only because the test title carries extra
words:

```
Scenario "Invalid timezone syntax is rejected"
     -> test "assertValidOptionalTimezone > rejects invalid timezone %j"
        score 0.40, shared: invalid, timezone            <- right, and below 0.6

Scenario "Switching tabs calls onActiveTabChange"
     -> test "Catalog > calls onActiveTabChange with the clicked tab id"
        score 0.33, shared: calls, onActiveTabChange     <- right

Scenario "Favourite matching is by full path, not by name"
     -> test "buildPromptPath > joins the folder path and the name"
        score 0.29, shared: path, name                   <- wrong
```

The 0.6 threshold is conservative on purpose, and that conservatism is what keeps
false passes at zero. The price is that a true match often lands one band lower.
Which reframes the number: on ai-dial-chat, `uncertain` is not the tool being
unsure about 4,342 things, it is the tool having narrowed 4,342 scenarios down to
one ranked candidate each, ready for `openspec-guard link` to turn into a
selector with one keypress.

That is the measured argument for the assisted linker being the second feature
built, ahead of anything cleverer in the scorer.

### It holds at that size

The largest run, 6,606 criteria against 9,059 test titles across 309 spec files,
takes about 10 seconds and produces a 10.6 MB JSON document. Two consecutive
runs of it are byte for byte identical, which is the determinism guarantee tested
at a scale no fixture reaches.

## Why the defaults are what they are

The `--min-shared-terms 2` floor is doing real work: without it, every
single-word collision above becomes a pass. The 0.6 pass threshold and the 0.25
uncertain threshold produced, on these two repositories, zero false passes and
a clearly separated noise band. That is the evidence for the defaults; it is
not a proof that they are optimal on any other corpus.

## Known limitation found by this measurement

The monorepo contains a nested git worktree under `apps/mobile/.claude/`. The
walker descends into it, so every test title in that worktree is indexed twice:
38 criteria came back with a duplicate of their own best candidate in the
runners-up, and any selector pointing at one of those titles would be reported
as `selector-ambiguous`.

SpecGuard does not special-case any tool's directory convention. Scope the run
instead:

```bash
openspec-guard check --tests "packages/**/*.test.ts" --tests "apps/web/**/*.test.ts"
```

## What still is not measured

Nobody has used this tool because they wanted to. Every number here comes from
running it at somebody, including the five public repositories, whose authors
have not seen a line of it. Whether a team keeps a baseline honest over a
quarter, and whether the linker is bearable for four hundred scenarios rather
than four, are not things a measurement can settle.

## Reproducing

```bash
pnpm build
node dist/cli.js check --cwd <repository> --format json > report.json
node -e "const r=require('./report.json'); console.log(r.summary)"
```

Two runs on the same repository produce identical bytes, so a report can be
committed and diffed.
