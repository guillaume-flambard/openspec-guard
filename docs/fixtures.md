# Fixtures

`tests/fixtures/` holds small sample repositories. They are the frozen input
SpecGuard is tested against, and nothing else: no test in this repository reads
a file outside that directory.

`tests/fixtures.test.ts` enforces two properties that keep the suite
reproducible on any machine:

- no symlink anywhere under `tests/fixtures`, so nothing reaches outside it;
- no absolute path in any fixture file, so no result depends on where the
  repository was cloned.

## Provenance

The shapes come from real OpenSpec repositories, the content does not. Nothing
here is copied verbatim from a private project. `tests/fixtures/corpus` is
written to reproduce, in miniature, the cases that actually occur in production
corpora:

| Shape                                     | Where                                            |
| ----------------------------------------- | ------------------------------------------------ |
| Base spec in French, with `NE SHALL PAS`  | `corpus/openspec/specs/console/spec.md`          |
| The same scenario title twice in one file | `corpus/openspec/specs/console/spec.md`          |
| Nested capability, two path segments      | `corpus/openspec/specs/account/settings/spec.md` |
| Working selector and a `non-testable`     | `corpus/openspec/specs/account/settings/spec.md` |
| `ADDED` delta, nested two levels deep     | `corpus/openspec/changes/add-search/...`         |
| `RENAMED` delta with `FROM`/`TO` bullets  | `corpus/openspec/changes/rename-profile/...`     |
| `REMOVED` delta, counted but not checked  | `corpus/openspec/changes/drop-legacy/...`        |
| English tests against French scenarios    | `corpus/src/console.test.ts`                     |

The single-purpose fixtures each pin exactly one verdict, so a regression names
itself:

`pass-explicit`, `pass-heuristic`, `uncertain`, `fail-low-similarity`,
`fail-no-candidate`, `fail-selector-broken`, `fail-selector-ambiguous`,
`skip-non-testable`, `skipped-test`, `bad-annotation`, `dynamic-titles`,
`empty-specs`, `ambiguous-roots`, `discovery`.

`empty-specs` and `discovery` reproduce two real-world edge cases: a spec
directory that exists but holds no `spec.md`, and a repository where build
output, `node_modules` and Playwright specs all sit beside the real tests.

## Adding a fixture

Add the directory, then add its name to the list in `tests/fixtures.test.ts`.
That list is asserted exactly, so a fixture cannot be added without a decision
about what it is for.
