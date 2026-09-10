# demo Specification

## Requirements

### Requirement: Email validation

The system SHALL reject an invalid email address.

#### Scenario: Rejects an invalid email
<!-- specguard:test="a" -->
<!-- specguard:non-testable reason="b" -->

- **WHEN** a visitor submits a malformed address
- **THEN** the system refuses it

#### Scenario: Rejects a blank field
<!-- specguard:non-testable -->

- **WHEN** a visitor submits nothing
- **THEN** the system refuses it
