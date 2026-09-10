# verdicts Specification

## Purpose

Turning a match into a verdict, and deciding whether a run fails a build.

## Requirements

### Requirement: A skipped test is a failure with a name, never a skip

The system SHALL reserve the `skip` verdict for a scenario declared
non-testable, and SHALL report a criterion matched only by a skipped test as a
failure of its own kind.

#### Scenario: The only matching test is skipped

<!-- openspec-guard:test="matchCriterion, similarity > never counts a skipped test as coverage" -->

- **WHEN** the best candidate is a skipped test
- **THEN** the criterion fails rather than counting as covered

#### Scenario: The two are never confused

<!-- openspec-guard:test="reserves skip for non-testable, never for a skipped test" -->

- **WHEN** the verdict table is consulted
- **THEN** only `non-testable` yields a skip

### Requirement: The summary separates the asserted from the guessed

The system SHALL count passes earned by an explicit selector apart from passes
earned by similarity, because the two are not worth the same thing.

#### Scenario: A mix of both

<!-- openspec-guard:test="counts verdicts and splits pass by how it was earned" -->

- **WHEN** a run holds passes of both kinds and failures of every kind
- **THEN** each is counted in its own field

#### Scenario: The split always adds up

<!-- openspec-guard:test="always has passBySelector plus passByHeuristic equal to pass" -->

- **WHEN** any run is summarized
- **THEN** the two pass counts sum to the total number of passes

### Requirement: Gates are opt-in, and both apply

The system SHALL exit zero by default whatever the verdicts, SHALL fail when a
verdict named by `--fail-on` appears, SHALL fail when `--min-pass` is not
reached, and SHALL report both violations when both are broken.

#### Scenario: No gate at all

<!-- openspec-guard:test="passes when no gate is set" -->

- **WHEN** a run has failures but no gate
- **THEN** it succeeds, because it reports rather than judges

#### Scenario: A forbidden verdict appears

<!-- openspec-guard:test="fails on a forbidden verdict" -->

- **WHEN** a verdict named by the gate is present
- **THEN** the gate is violated and the count is named

#### Scenario: A forbidden verdict that never occurs

<!-- openspec-guard:test="ignores a forbidden verdict that does not occur" -->

- **WHEN** the gate names verdicts that no criterion carries
- **THEN** the gate passes

#### Scenario: Not enough passing criteria

<!-- openspec-guard:test="fails when min-pass is not reached" -->

- **WHEN** fewer criteria pass than `--min-pass` requires
- **THEN** the gate is violated

#### Scenario: Both gates broken at once

<!-- openspec-guard:test="reports both violations when both gates are broken" -->

- **WHEN** a run violates both gates
- **THEN** both violations are reported, not just the first
