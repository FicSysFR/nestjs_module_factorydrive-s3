<p align="center">
  <a href="http://nestjs.com/" target="blank">
    <img src="https://nestjs.com/img/logo_text.svg" width="320" alt="Nest Logo" />
  </a>
</p>

<p align="center">
  S3 driver for Factory drive module from NestJS framework
</p>

<p align="center">
  <a href="https://www.npmjs.com/org/ficsysfr"><img src="https://img.shields.io/npm/v/@ficsysfr/nestjs_module_factorydrive-s3.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/org/ficsysfr"><img src="https://img.shields.io/npm/l/@ficsysfr/nestjs_module_factorydrive-s3.svg" alt="Package License" /></a>
  <a href="https://github.com/FicSysFR/nestjs_module_factorydrive-s3/actions/workflows/ci.yml"><img src="https://github.com/FicSysFR/nestjs_module_factorydrive-s3/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://codecov.io/gh/FicSysFR/nestjs_module_factorydrive-s3"><img src="https://codecov.io/gh/FicSysFR/nestjs_module_factorydrive-s3/graph/badge.svg" alt="Coverage" /></a>
  <a href="https://github.com/FicSysFR/nestjs_module_factorydrive-s3/actions/workflows/release.yml?event=workflow_dispatch"><img alt="Release" src="https://github.com/FicSysFR/nestjs_module_factorydrive-s3/actions/workflows/release.yml/badge.svg"></a>
</p>
<br>

# S3 driver for Factory drive module
S3 storage driver for [`@ficsysfr/nestjs_module_factorydrive`](https://www.npmjs.com/package/@ficsysfr/nestjs_module_factorydrive), built for NestJS.

## Features
- Amazon S3-compatible implementation of `AbstractStorage`
- Common file operations (`put`, `get`, `copy`, `move`, `delete`, `exists`)
- Stream and buffer support for downloads/uploads
- Signed URL generation via AWS SDK v3
- Flat listing with automatic pagination (`listObjectsV2`)
- Domain exceptions mapping from S3 errors

## Requirements
- Node.js `>= 22`
- Bun `>= 1` (for local scripts/tests in this repository)
- A configured S3 bucket (AWS S3 or S3-compatible endpoint)

## Installation
Install the Factory Drive core module and this S3 driver:

```bash
npm install @ficsysfr/nestjs_module_factorydrive @ficsysfr/nestjs_module_factorydrive-s3
```

```bash
yarn add @ficsysfr/nestjs_module_factorydrive @ficsysfr/nestjs_module_factorydrive-s3
```

```bash
pnpm add @ficsysfr/nestjs_module_factorydrive @ficsysfr/nestjs_module_factorydrive-s3
```

```bash
bun add @ficsysfr/nestjs_module_factorydrive @ficsysfr/nestjs_module_factorydrive-s3
```

## Quick start (NestJS)
Register the driver class in your app startup:

```ts
import { Module } from '@nestjs/common'
import { FactorydriveService } from '@ficsysfr/nestjs_module_factorydrive'
import { AwsS3Storage } from '@ficsysfr/nestjs_module_factorydrive-s3'

@Module({
  // ...
})
export class AppModule {
  public constructor(storage: FactorydriveService) {
    storage.registerDriver('s3', AwsS3Storage)
  }
}
```

## Driver configuration
The constructor accepts `AmazonWebServicesS3StorageConfig`, which extends AWS `S3ClientConfig` and adds:

- `bucket` (string, required): target bucket name

Example:

```ts
import { AwsS3Storage } from '@ficsysfr/nestjs_module_factorydrive-s3'

const storage = new AwsS3Storage({
  bucket: 'my-app-bucket',
  region: 'eu-west-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})
```

For S3-compatible providers (MinIO, DigitalOcean Spaces, Backblaze B2, Cloudflare R2, etc.), pass your custom endpoint/options through standard AWS SDK `S3ClientConfig`. Do **not** hardcode provider-specific options in the driver — leave them to the consumer via `config`.

### Backblaze B2 (S3-compatible)

B2 often requires disabling AWS SDK v3 flexible checksums on put/get. Pass them through `S3ClientConfig`:

```ts
const storage = new AwsS3Storage({
  bucket: 'my-b2-bucket',
  region: 'us-west-004',
  endpoint: 'https://s3.us-west-004.backblazeb2.com',
  credentials: {
    accessKeyId: process.env.B2_KEY_ID!,
    secretAccessKey: process.env.B2_APPLICATION_KEY!,
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
})
```

These checksum options are optional and should not be set for real AWS S3 unless you have a specific need.

## Available methods

### Write / update
- `put(location, content)`: upload string, `Buffer`, or readable stream
- `copy(src, dest)`: copy object within the bucket
- `move(src, dest)`: copy then delete source
- `delete(location)`: delete object (`wasDeleted` is `null`, raw response is exposed)

### Read
- `get(location, encoding?)`: returns file content as text
- `getBuffer(location)`: returns file content as `Buffer`
- `getStream(location)`: returns a readable stream
- `getStat(location)`: returns `{ size, modified, raw }`
- `exists(location)`: checks object existence
- `flatList(prefix?)`: async iterator over all object keys (paginated)
- `getSignedUrl(location, options?)`: temporary signed GET URL (default `expiresIn = 900` seconds)

## Error handling
Known S3 errors are converted into Factory Drive exceptions:

- `NoSuchBucket` -> `NoSuchBucketException`
- `NoSuchKey` -> `FileNotFoundException`
- `AllAccessDisabled` -> `PermissionMissingException`
- any other error -> `UnknownException`

This keeps error handling consistent with the rest of the Factory Drive ecosystem.

## Example usage
```ts
await storage.put('documents/invoice.txt', 'hello world')

const { exists } = await storage.exists('documents/invoice.txt')
if (exists) {
  const file = await storage.get('documents/invoice.txt')
  console.log(file.content)
}

const signed = await storage.getSignedUrl('documents/invoice.txt', { expiresIn: 60 })
console.log(signed.signedUrl)
```

## Development
Useful scripts:

- `yarn lint`: run Biome checks
- `yarn typecheck`: typecheck without emitting files
- `yarn test`: run Vitest tests
- `yarn test:coverage`: run tests with enforced coverage thresholds
- `yarn build`: build the package
- `yarn package` / `make package`: create and audit the npm tarball under `.artifacts/npm/`
- `make check`: run every local quality gate
- `make release VERSION=2.0.0 CHANNEL=latest WATCH=1`: dispatch and optionally watch the manual release

CI runs tests (with coverage upload) and build on pushes/PRs.

## Compatibility
- Peer dependency: `@ficsysfr/nestjs_module_factorydrive@^2.0.0`
- TypeScript peer dependency: `^5.0.0`

## Security
Please read [`SECURITY.md`](./SECURITY.md) before reporting vulnerabilities.

## License
MIT, see [`LICENSE`](./LICENSE).
