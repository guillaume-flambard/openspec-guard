# Conventions de specs et de traçabilité : OpenSpec, BMad et AIDD

Recherche effectuée le 10 septembre 2026 contre les dépôts et documentations
officiels sur leur branche principale. « Absence » ci-dessous signifie qu'aucun
construct n'est défini dans les sources officielles citées, pas qu'une équipe ne
peut pas adopter sa propre convention.

## Résultats

| Écosystème     | Critères et scénarios canoniques                                                                                                                                                  | Lien spec → test                                                                                                                                                                                        | Non-testable                                                                                                                                    |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenSpec       | `## Requirements`, puis `### Requirement: <nom>`, un énoncé normatif `SHALL`/`MUST`, et `#### Scenario: <nom>` avec `WHEN`/`THEN`                                                 | Aucun champ, tag ou annotation natif                                                                                                                                                                    | Aucun marqueur natif ; le schéma demande au contraire au moins un scénario par requirement et indique que les scénarios doivent être testables. |
| BMad Method    | Une story porte des acceptance criteria. Le workflow Build exige le format Given/When/Then pour tous les AC.                                                                      | Le module officiel optionnel TEA produit une matrice de traçabilité et relie requirements et tests avec Given/When/Then ; aucun sélecteur de titre de test dans le Markdown de la story n'est prescrit. | Aucun marqueur de story/AC « non-testable » identifié. TEA traite les problèmes de testabilité dans ses artefacts de test design.               |
| AIDD Framework | Le flux `/task` crée un epic à requirements explicites, puis `/execute` applique le TDD, une requirement à la fois. Le skill TDD demande `given` et `should` dans ses assertions. | Aucune grammaire Markdown ni référence standardisée à un test trouvée. Le skill conseille des blocs `describe` et `test`, mais ne définit aucun lien depuis la spec.                                    | Aucun marqueur identifié.                                                                                                                       |

## Sources et détails vérifiables

### OpenSpec

- Le [schéma `spec-driven`](https://github.com/Fission-AI/OpenSpec/blob/main/schemas/spec-driven/schema.yaml#L75-L85) impose les sections delta `ADDED`/`MODIFIED`/`REMOVED`/`RENAMED`, le titre `### Requirement: <name>`, les mots normatifs `SHALL` ou `MUST`, et le scénario `#### Scenario: <name>`. Il exige aussi un scénario par requirement. Son [exemple officiel](https://github.com/Fission-AI/OpenSpec/blob/main/schemas/spec-driven/schema.yaml#L109-L130) illustre exactement cette hiérarchie et précise qu'un scénario est un cas de test potentiel.
- Le parseur confirme la contrainte structurelle : une spec principale ne lit les requirements que sous `## Requirements` et reconnaît `### Requirement:` de façon canonique ([`spec-structure.ts`](https://github.com/Fission-AI/OpenSpec/blob/main/src/core/parsers/spec-structure.ts#L2-L6), [lignes 54-66](https://github.com/Fission-AI/OpenSpec/blob/main/src/core/parsers/spec-structure.ts#L54-L66)).
- Techniquement, tout sous-titre de niveau 4 est compté comme scénario, pas seulement un titre nommé `Scenario:` ([`requirement-text.ts`](https://github.com/Fission-AI/OpenSpec/blob/main/src/core/parsers/requirement-text.ts#L21-L27)). Un futur bloc `#### SpecGuard metadata` serait donc, à tort, un scénario OpenSpec.
- Les lecteurs et validateurs OpenSpec ne définissent ni `test:`, ni `non-testable`, ni une référence de fichier/titre de test. Ce n'est pas un champ omis par l'exemple : le schéma et les parseurs cités sont l'autorité de format.

### BMad Method

- La documentation officielle décrit les stories comme porteuses de critères d'acceptation implémentables ([Break Work into Stories](https://docs.bmad-method.org/plan/break-work-into-stories-and-track-it/#prepare-the-units)). Son workflow Build stipule explicitement qu'une spec prête au développement a tous ses AC en Given/When/Then ([`workflow.md`](https://github.com/bmad-code-org/BMAD-METHOD/blob/main/src/bmm-skills/ship/bmad-build/workflow.md#L8-L17)).
- Pour la traçabilité, l'extension officielle [TEA](https://github.com/bmad-code-org/bmad-method-test-architecture-enterprise) est le mécanisme pertinent : elle mappe requirements et tests en Given/When/Then, puis calcule la couverture et une décision de gate ([README, lignes 292-303](https://github.com/bmad-code-org/bmad-method-test-architecture-enterprise/blob/main/README.md#L292-L303)). L'ATDD crée des squelettes `test.skip()` avant implémentation, mais cela reste une sortie de workflow, pas un tag de test dans une story ([command reference](https://github.com/bmad-code-org/bmad-method-test-architecture-enterprise/blob/main/docs/reference/commands.md#L378-L397)).

### AIDD Framework

- Le [README officiel](https://github.com/paralleldrive/aidd/blob/main/README.md#L247-L260) définit la chaîne `/discover` → `/task` → `/execute`, et le détaille comme « requirements clairs » puis TDD une requirement à la fois ([lignes 325-334](https://github.com/paralleldrive/aidd/blob/main/README.md#L325-L334)).
- Son [skill TDD](https://github.com/paralleldrive/aidd/blob/main/ai/skills/aidd-tdd/SKILL.md#L249-L280) utilise une forme d'assertion avec `given` et `should`, impose un bloc `describe` nommé, et recommande un titre bref dans `test`. Cela décrit les tests, non un format de spec Markdown ni une liaison explicite depuis une requirement.

## Recommandation limitée à SpecGuard v1 et OpenSpec

1. Accepter sans extension le format OpenSpec officiel. Extraire un critère par
   `#### Scenario:` sous un `### Requirement:` plutôt que de tenter de faire de
   chaque puce Given/When/Then un critère autonome.
2. Ne pas présenter `- test: "…"` ou `- non-testable: true` comme du
   OpenSpec. Ce sont des extensions SpecGuard, inconnues du format officiel.
3. Si v1 a besoin du matching explicite et du `skip`, adopter des commentaires
   HTML immédiatement sous le titre du scénario. Ils ne créent pas un nouveau
   sous-titre `####`, donc évitent le comportement du parseur OpenSpec cité
   ci-dessus, restent lisibles dans le Markdown rendu et sont simples à
   extraire de façon déterministe :

   ```md
   #### Scenario: Création avec un email valide

   <!-- specguard:test="creates a user with a valid email" -->

   - **WHEN** a visitor submits a valid email
   - **THEN** the system creates the user
   ```

   ```md
   #### Scenario: Avis de conformité manuelle

   <!-- specguard:non-testable reason="Requires a human legal assessment" -->

   - **WHEN** the release is prepared
   - **THEN** legal approval is recorded
   ```

   Les deux directives doivent être mutuellement exclusives. `non-testable`
   devrait exiger une `reason` non vide afin que `skip` reste auditable. Cette
   convention est une extension SpecGuard documentée, non une prétendue syntaxe
   OpenSpec.
