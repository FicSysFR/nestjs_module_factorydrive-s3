# Contexte du projet

## Produit

- Objectif : driver AWS S3 (`AwsS3Storage`) pour `@ficsysfr/nestjs_module_factorydrive`, le module NestJS d'abstraction de stockage fichiers.
- Utilisateurs : applications NestJS consommant le cœur Factorydrive et voulant un disque S3 nommé.
- Contraintes métier majeures :

## Architecture actuelle

- Applications ou services : package npm unique (`@ficsysfr/nestjs_module_factorydrive-s3`), pas d'application ni de service exécutable.
- Frontières importantes : implémente le contrat `AbstractStorage` exposé par le cœur ; le cœur reste agnostique d'AWS (pas de dépendance AWS dans `src/` du cœur).
- Sources de données : buckets AWS S3.
- Intégrations externes : `@aws-sdk/client-s3` et `@aws-sdk/s3-request-presigner` (URLs signées).

## Langage du domaine

Termes canoniques du métier, un par entrée, affûtés par le skill
`domain-language` au fil des sessions plutôt que remplis d'un coup :

- **AwsS3Storage** : classe du driver, étend `AbstractStorage` du cœur Factorydrive et implémente les opérations de disque sur S3.
- **AmazonWebServicesS3StorageConfig** : configuration du driver (étend `S3ClientConfig` du SDK AWS, ajoute `bucket`).
- **disque** (disk) : cible de stockage nommée, enregistrée et résolue par le `StorageManager` du cœur.

## Développement

- Runtime et versions : Node >= 22.0.0 ; TypeScript ^5.9.3.
- Package manager : Yarn 1.22.22 (`packageManager` dans `package.json`).
- Commande d'installation : `yarn install --frozen-lockfile` (`make install`).
- Commande de développement : sans objet — bibliothèque, pas de serveur de développement.
- Commande de build : `yarn build` (`make build`) — typecheck puis `tsc -p tsconfig.build.json`.
- Commandes de lint, de type-check et de test : `yarn lint` (Biome), `yarn typecheck`, `yarn test` (Vitest) ; `make check` regroupe lint + typecheck + test + build + `test:scripts` + `changelog:check` + `package:check`.
- Serveur de développement lancé par : sans objet.

## Conventions spécifiques

- Langue de la prose : déclarée dans `.agents/language.json`
- Conventions de code : Biome unique outil de lint/format (pas d'ESLint ni de Prettier) ; imports valeur pour les symboles Nest/classes injectées (DI), `import type` pour les types purs ; un fichier = une responsabilité.
- Bibliothèques imposées ou interdites : ne pas ajouter de dépendance AWS SDK au cœur Factorydrive (`@ficsysfr/nestjs_module_factorydrive`) — elle reste réservée à ce driver.
- Documentation à maintenir avec le code : `README.md`, `CHANGELOG.md` généré depuis `changelog/*.md` (`yarn changelog:check` / `yarn changelog:write`).
- Dossiers en lecture seule :
- Contraintes de compatibilité : peer dependency `@ficsysfr/nestjs_module_factorydrive@^2.0.0` — un changement rompant cette compatibilité impose un bump MAJOR.
- Exigences de sécurité ou de conformité :

## Livraison et exploitation

- Environnements : sans objet — bibliothèque npm, pas d'environnement applicatif déployé.
- Commande de release : `make release VERSION=X.Y.Z CHANNEL=latest` (déclenche `.github/workflows/release.yml` en `workflow_dispatch`, qui synchronise la version, régénère `CHANGELOG.md` depuis `changelog/X.Y.Z.md`, tague et publie sur npm avec provenance).
- Déploiement : publication npm (`@ficsysfr/nestjs_module_factorydrive-s3`) via GitHub Actions.
- Observabilité :
- Sauvegardes et rollback :

Ne consigner aucun secret dans ce fichier.

