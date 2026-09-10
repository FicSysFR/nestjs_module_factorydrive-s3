import { GetObjectCommand, S3, type S3ClientConfig } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import {
  AbstractStorage,
  type ContentResponse,
  type DeleteResponse,
  type ExistsResponse,
  type FileListResponse,
  FileNotFoundException,
  NoSuchBucketException,
  PermissionMissingException,
  type Response,
  type SignedUrlOptions,
  type SignedUrlResponse,
  type StatResponse,
  UnknownException,
} from '@ficsysfr/nestjs_module_factorydrive'

export interface AmazonWebServicesS3StorageConfig extends S3ClientConfig {
  bucket: string
}

function handleError(err: unknown, path: string, bucket: string): Error {
  const error = err instanceof Error ? err : new Error(String(err))
  switch (error.name) {
    case 'NoSuchBucket':
      return new NoSuchBucketException(error, bucket)
    case 'NoSuchKey':
      return new FileNotFoundException(error, path)
    case 'AllAccessDisabled':
      return new PermissionMissingException(error, path)
    default:
      return new UnknownException(error, error.name, path)
  }
}

/** Detect missing-object errors from AWS SDK v2 and v3 shapes. */
function isNotFound(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as {
    name?: string
    Code?: string
    $metadata?: { httpStatusCode?: number }
    statusCode?: number
  }
  return e.name === 'NotFound' || e.name === 'NoSuchKey' || e.Code === 'NotFound' || e.Code === 'NoSuchKey' || e.$metadata?.httpStatusCode === 404 || e.statusCode === 404
}

// noinspection JSUnusedGlobalSymbols
export class AwsS3Storage extends AbstractStorage {
  protected $driver: S3
  protected $bucket: string

  public constructor(config: AmazonWebServicesS3StorageConfig) {
    super()
    this.$driver = new S3(config)
    this.$bucket = config.bucket
  }

  public async copy(src: string, dest: string): Promise<Response> {
    try {
      const result = await this.$driver.copyObject({
        Key: dest,
        Bucket: this.$bucket,
        CopySource: `/${this.$bucket}/${src}`,
      })
      return { raw: result }
    } catch (e) {
      throw handleError(e, src, this.$bucket)
    }
  }

  public async delete(location: string): Promise<DeleteResponse> {
    const params = { Key: location, Bucket: this.$bucket }
    try {
      const result = await this.$driver.deleteObject(params)
      return { raw: result, wasDeleted: null }
    } catch (e) {
      throw handleError(e, location, this.$bucket)
    }
  }

  public driver(): S3 {
    return this.$driver
  }

  public async exists(location: string): Promise<ExistsResponse> {
    try {
      const result = await this.$driver.headObject({ Key: location, Bucket: this.$bucket })
      return { exists: true, raw: result }
    } catch (e) {
      if (isNotFound(e)) {
        return { exists: false, raw: e }
      } else {
        throw handleError(e, location, this.$bucket)
      }
    }
  }

  public async get(location: string, encoding: BufferEncoding = 'utf-8'): Promise<ContentResponse<string>> {
    const bufferResult = await this.getBuffer(location)
    return {
      content: bufferResult.content.toString(encoding),
      raw: bufferResult.raw,
    }
  }

  public async getBuffer(location: string): Promise<ContentResponse<Buffer>> {
    try {
      const result = await this.$driver.getObject({ Key: location, Bucket: this.$bucket })
      if (!result.Body) throw new Error(`S3 returned no body for ${location}`)
      const body = await result.Body.transformToByteArray()
      return { content: Buffer.from(body), raw: result }
    } catch (e) {
      throw handleError(e, location, this.$bucket)
    }
  }

  public async getSignedUrl(location: string, options: SignedUrlOptions & NonNullable<Parameters<typeof getSignedUrl>[2]> = {}): Promise<SignedUrlResponse> {
    const { expiresIn = 900 } = options
    try {
      const params = {
        Key: location,
        Bucket: this.$bucket,
        Expires: expiresIn,
      }
      const result = await getSignedUrl(this.$driver, new GetObjectCommand(params), options)
      return { signedUrl: result, raw: result }
    } catch (e) {
      throw handleError(e, location, this.$bucket)
    }
  }

  public async getStat(location: string): Promise<StatResponse> {
    const params = { Key: location, Bucket: this.$bucket }

    try {
      const result = await this.$driver.headObject(params)
      return {
        size: result.ContentLength as number,
        modified: result.LastModified as Date,
        raw: result,
      }
    } catch (e) {
      throw handleError(e, location, this.$bucket)
    }
  }

  public async getStream(location: string): Promise<NodeJS.ReadableStream> {
    const params = { Key: location, Bucket: this.$bucket }
    try {
      const res = await this.$driver.getObject(params)
      return res.Body as NodeJS.ReadableStream
    } catch (e) {
      throw handleError(e, location, this.$bucket)
    }
  }

  public async move(src: string, dest: string): Promise<Response> {
    await this.copy(src, dest)
    await this.delete(src)
    return { raw: undefined }
  }

  public async put(location: string, content: Buffer | NodeJS.ReadableStream | string): Promise<Response> {
    try {
      const result = await this.$driver.putObject({
        Key: location,
        Body: content as Buffer,
        Bucket: this.$bucket,
      })
      return { raw: result }
    } catch (e) {
      throw handleError(e, location, this.$bucket)
    }
  }

  public async *flatList(prefix = ''): AsyncIterable<FileListResponse> {
    let continuationToken: string | undefined

    do {
      try {
        // noinspection JSUnusedAssignment
        const response = await this.$driver.listObjectsV2({
          Bucket: this.$bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
          MaxKeys: 1000,
        })

        continuationToken = response.NextContinuationToken

        for (const file of response.Contents ?? []) {
          yield {
            raw: file,
            path: file.Key as string,
          }
        }
      } catch (e) {
        throw handleError(e, prefix, this.$bucket)
      }
    } while (continuationToken)
  }
}
