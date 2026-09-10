# SpecGuard v1

## Résumé

Créer `@memo-labs/specguard`, une CLI Node 20+ ESM dont le binaire reste
`specguard`, et une GitHub Action sans dépendance réseau au runtime. Elle
analyse exclusivement OpenSpec et les tests Vitest/Jest, sans exécuter les
tests ni appeler de LLM.

## Changements clés

- Initialiser le paquet TypeScript avec un build distribuant une CLI et une
  action JavaScript autonomes, une licence MIT, un README d'installation et
  des exemples CI.
- Implémenter `specguard check` :
  - Découverte sûre des specs : `openspec/specs`, sinon `specs`, erreur claire
    si aucun ou plusieurs dossiers sont détectés. `--specs` et `--code`
    remplacent cette détection.
  - Lecture des specs OpenSpec canoniques, y compris les requirements normaux
    et les sections delta. Chaque `#### Scenario:` devient un critère avec
    `id`, requirement, scénario, fichier et ligne. L'ID est un `sha256`
    tronqué sur le chemin relatif et le contenu normalisé du scénario.
  - Extensions SpecGuard uniquement via commentaires HTML sous le scénario :
    `specguard:test="…"`, ou `specguard:non-testable reason="…"`. Elles sont
    exclusives. Un commentaire mal formé est une erreur de configuration.
  - Détection de Vitest/Jest depuis le manifeste ou la configuration du
    projet, puis extraction AST TypeScript des titres statiques
    `describe`/`it`/`test`, y compris les suites imbriquées et les
    modificateurs (`skip`, `only`). Les fichiers de build, dépendances et
    couverture sont exclus.
  - Matching déterministe : sélecteur explicite exact en priorité, sinon
    normalisation bilingue des mots significatifs et score Jaccard. Score
    supérieur ou égal à 0,60 avec au moins deux mots partagés : `pass`; score
    entre 0,25 et 0,59 : `uncertain`; aucun candidat : `fail`;
    `non-testable` : `skip`. En cas d'égalité, le chemin puis la ligne
    assurent le choix stable.
  - Rapport terminal lisible et `--format json`, avec un unique verdict et le
    meilleur test retenu par critère. Le JSON est silencieux et structuré avec
    métadonnées, résumé et résultats.
  - Gates optionnels : par défaut sortie `0`; `--fail-on fail,uncertain`
    échoue si un verdict visé apparaît; `--min-pass N` exige au moins N
    `pass`; les deux contraintes se cumulent. Erreurs d'entrée ou d'option
    retournent un code distinct.
- Ajouter `action.yml` JavaScript avec les entrées correspondant aux options
  CLI et exécution du binaire embarqué. Aucune installation npm pendant le
  run de l'action.

## Validation

- Tests unitaires du parseur OpenSpec, des annotations, des IDs stables, de
  l'extraction AST et des seuils de matching.
- Fixtures d'intégration couvrant exactement `pass` explicite, `pass`
  heuristique fort, `uncertain`, `fail`, `skip`, JSON parsable, flags de gate,
  erreurs et répétition identique de deux runs.
- Construire puis tester l'archive npm et l'Action avec le code distribué, pas
  seulement les sources.
- Étendre Reprisette avec Vitest, une spec OpenSpec minimale sur
  `lib/names.ts`, et ses tests correspondants avec sélecteurs explicites.
  Ajouter le script de vérification et le faire passer avec
  `--fail-on fail,uncertain`.

## Hypothèses retenues

- Publication sous `@memo-labs/specguard`; le nom npm nu et le package
  `@spec-guard/cli` ne sont pas utilisés.
- Le périmètre reste Vitest/Jest : `node:test`, tests dynamiques et autres
  formats de spec restent hors v1.
- L'extension HTML est documentée comme convention SpecGuard, jamais comme
  une syntaxe OpenSpec.
- Les modifications de Reprisette sont limitées à l'infrastructure de test,
  une fonction pure existante et son exemple OpenSpec, sans travail
  fonctionnel sur l'application.
