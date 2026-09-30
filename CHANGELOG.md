# Changelog

All notable changes to Factorydrive are documented here.

## 2.0.1 - 2026-09-29

### Correctifs

- `put()` accepte les flux lisibles de taille inconnue. Ils étaient rejetés côté client par l’AWS SDK v3 avant tout appel réseau (`Invalid value "undefined" for header "x-amz-decoded-content-length"`, remonté en `UnknownException` `E_UNKNOWN`). Les flux passent désormais par `Upload` de `@aws-sdk/lib-storage` : un seul `PutObject` jusqu’à 5 Mio, un upload multipart au-delà. Les `Buffer` et chaînes continuent d’utiliser `putObject`.
- Une erreur du flux source ou de S3 pendant l’upload rejette la promesse de `put()` avec une exception Factorydrive, sans rejet non géré, et l’upload multipart en cours est annulé (`AbortMultipartUpload`).
- Les flux non natifs acceptés par `isReadableStream` (par exemple `readable-stream`) sont enveloppés dans un `stream.Readable` compatible avec `@aws-sdk/lib-storage`.

### Dépendances

- Ajout de `@aws-sdk/lib-storage` (`>=3.1004.0`).

### Image de marque et licence

- Alignement du logo et du lien de documentation du README sur ceux du cœur `@ficsysfr/nestjs_module_factorydrive` (`logo-full.svg` / `logo-full-dark.svg`).
- Passage de la licence du package sous Apache-2.0 avec copyright FicSys 2026, à l'image du cœur Factorydrive ; les versions publiées jusqu'à 2.0.0 incluse restent disponibles sous MIT.
- Ajout des en-têtes SPDX (`SPDX-License-Identifier: Apache-2.0`) dans les fichiers sources.

### Documentation

- Le README décrit les uploads en flux : stratégie, mémoire utilisée, limite de parts, permissions IAM et règle de cycle de vie pour les uploads multipart incomplets.

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
