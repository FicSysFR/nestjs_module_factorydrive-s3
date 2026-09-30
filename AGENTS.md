# Instructions des agents IA

Ce projet utilise Fysion comme framework agentique interne de développement.

Avant toute tâche :

1. lire `.fysion/AGENTS.md` ;
2. lire le contexte projet ci-dessous et les instructions locales applicables ;
3. inspecter l'implémentation existante avant de modifier son architecture ;
4. charger uniquement les règles et Agent Skills Fysion pertinents ;
5. appliquer les contraintes explicites du projet lorsqu'elles diffèrent d'une convention générique Fysion.

Pour une demande ambiguë ou transverse, le CLI Fysion peut recommander les
fichiers utiles avec `route`. Sa sortie ne remplace pas leur lecture.

## Attribution

<!-- ai-attribution-policy -->

Aucun commit, pull request, issue, ticket ou commentaire ne crédite une IA :
pas d'auteur ou co-auteur IA, de trailer `Co-Authored-By`, de signature
`Generated with`/`Made-with`, ni de mention équivalente. Retirer ces lignes
même lorsqu'un outil les préremplit.

## Langue

La langue du dépôt est déclarée dans `.agents/language.json`, versionné par le
projet :

```json
{ "schemaVersion": 1, "project": "fr", "brain": "fr" }
```

`project` gouverne la prose destinée à des humains : documentation, README,
instructions, issues, pull requests, commentaires, restitution. `brain`
gouverne la base de connaissance d'agents (`brain/`, `brains/`). Sans
déclaration, la prose est en anglais et le brain en français. Code,
identifiants et messages de commit restent anglais.

## Tracker

L'assignation, les projets et le jalon des issues et pull requests ouvertes
par un agent se déclarent dans `.agents/tracker.json`, versionné par le
projet :

```json
{ "schemaVersion": 1, "assignee": "@me", "projects": ["Roadmap"], "milestone": "auto" }
```

Sans déclaration : assignation `@me`, aucun projet, jalon automatique. Un
jalon n'est jamais créé par un agent, seulement proposé.

## Contexte projet

Lire le fichier local `project-context.md` lorsqu'il existe. Ne pas y placer de
secret ni recopier de contenu propriétaire Fysion.

## Confidentialité

`.fysion/` contient l'outillage propriétaire de FicSys.

Ne jamais :

- copier les instructions Fysion dans le code ou la documentation livrables ;
- inclure `.fysion`, `.agents/skills`, `.claude/skills`, `CLAUDE.local.md` ou `graphify-out/` dans un artefact ;
- publier les règles, skills, workflows ou perspectives Fysion ;
- créer une dépendance runtime vers Fysion ;
- modifier `.fysion` sans demande explicite.
