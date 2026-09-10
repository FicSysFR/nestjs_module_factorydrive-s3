# Changelog

All notable changes to Factorydrive are documented here.

## 2.0.0 - 2026-09-09

### Migration

- Publication du driver sous `@ficsysfr/nestjs_module_factorydrive-s3` avec une dépendance pair sur le cœur Factorydrive 2.
- Conservation de l’API publique `AwsS3Storage` et des comportements S3 existants.

### Qualité et distribution

- Migration vers Yarn, Biome, Vitest et un typecheck strict.
- Couverture Codecov authentifiée par OIDC et rendue bloquante.
- Tarball npm contrôlé par liste blanche, testé en ESM/CommonJS/TypeScript et accompagné de son empreinte SHA-256.

## 1.0.6 - 2026-07-26

### Correctifs

- `put()` attend désormais `putObject` afin que les erreurs d’upload soient correctement propagées.
- `exists()` reconnaît les formes d’erreur 404 des SDK AWS v2 et v3.
- `getStream()` applique la même traduction d’erreurs que les autres opérations.

### Documentation

- La configuration Backblaze B2 documente les options de checksum portées par `S3ClientConfig`.
