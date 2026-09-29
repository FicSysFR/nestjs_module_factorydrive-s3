import { Readable, Stream } from 'node:stream'
import { AbortMultipartUploadCommand, CompleteMultipartUploadCommand, CreateMultipartUploadCommand, PutObjectCommand, UploadPartCommand } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { FileNotFoundException, NoSuchBucketException, PermissionMissingException, UnknownException } from '@ficsysfr/nestjs_module_factorydrive'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AwsS3Storage } from '../src/aws-s3.storage.js'

vi.mock('@aws-sdk/lib-storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@aws-sdk/lib-storage')>()
  // Spy on construction but keep the real part buffering, abort and error handling.
  return { ...actual, Upload: vi.fn(actual.Upload) }
})

const MIB = 1024 * 1024

type ErrorWithStatus = Error & {
  statusCode?: number
  Code?: string
  $metadata?: { httpStatusCode?: number }
}

function makeError(name: string, options?: { statusCode?: number; Code?: string; httpStatusCode?: number }): ErrorWithStatus {
  const error = new Error(name) as ErrorWithStatus
  error.name = name
  if (options?.statusCode !== undefined) {
    error.statusCode = options.statusCode
  }
  if (options?.Code !== undefined) {
    error.Code = options.Code
  }
  if (options?.httpStatusCode !== undefined) {
    error.$metadata = { httpStatusCode: options.httpStatusCode }
  }
  return error
}

function createStorage() {
  const storage = new AwsS3Storage({
    bucket: 'my-bucket',
    region: 'eu-west-1',
    credentials: {
      accessKeyId: 'test-access-key',
      secretAccessKey: 'test-secret-key',
    },
  })

  const driver = {
    copyObject: vi.fn(async (params: unknown) => ({ copied: params })),
    deleteObject: vi.fn(async (params: unknown) => ({ deleted: params })),
    headObject: vi.fn(async (params: unknown): Promise<Record<string, unknown>> => ({ head: params })),
    getObject: vi.fn(async (_params: unknown) => ({
      Body: {
        transformToByteArray: async () => new Uint8Array(Buffer.from('hello')),
      },
    })),
    putObject: vi.fn(async (params: unknown) => ({ put: params })),
    listObjectsV2: vi.fn(async () => ({
      NextContinuationToken: undefined as string | undefined,
      Contents: [] as Array<{ Key: string }>,
    })),
  }

  ;(storage as unknown as { $driver: unknown }).$driver = driver

  return { storage, driver }
}

/** Keeps the real S3 client (config, endpoint resolution) and mocks only the transport. */
function createStreamingStorage() {
  const storage = new AwsS3Storage({
    bucket: 'my-bucket',
    region: 'eu-west-1',
    credentials: {
      accessKeyId: 'test-access-key',
      secretAccessKey: 'test-secret-key',
    },
  })

  const sent: object[] = []
  const client = storage.driver() as unknown as { send: (command: object) => Promise<unknown> }
  vi.spyOn(client, 'send').mockImplementation(async (command) => {
    sent.push(command)
    if (command instanceof CreateMultipartUploadCommand) return { UploadId: 'upload-1' }
    if (command instanceof UploadPartCommand) return { ETag: `"part-${command.input.PartNumber}"` }
    if (command instanceof CompleteMultipartUploadCommand) return { ETag: '"multipart"' }
    if (command instanceof PutObjectCommand) return { ETag: '"single"' }
    return {}
  })

  return { storage, sent }
}

/** Passes isReadableStream() without being a core Readable, like `readable-stream` instances. */
function createUserlandStream(content: Buffer): NodeJS.ReadableStream {
  const stream = Object.assign(new Stream(), {
    readable: true,
    _readableState: {},
    _read() {},
    pause() {},
    resume() {},
  })
  setImmediate(() => {
    stream.emit('data', content)
    stream.emit('end')
  })
  return stream as unknown as NodeJS.ReadableStream
}

describe('AwsS3Storage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.mocked(Upload).mockClear()
  })

  it('retourne le driver', () => {
    const { storage, driver } = createStorage()
    expect(storage.driver()).toBe(driver as unknown as ReturnType<AwsS3Storage['driver']>)
  })

  it('copy copie un fichier avec les bons paramètres', async () => {
    const { storage, driver } = createStorage()
    const result = await storage.copy('src.txt', 'dest.txt')

    expect(driver.copyObject).toHaveBeenCalledWith({
      Key: 'dest.txt',
      Bucket: 'my-bucket',
      CopySource: '/my-bucket/src.txt',
    })
    expect(result.raw).toEqual({
      copied: {
        Key: 'dest.txt',
        Bucket: 'my-bucket',
        CopySource: '/my-bucket/src.txt',
      },
    })
  })

  it('exists retourne false sur 404 (statusCode SDK v2)', async () => {
    const { storage, driver } = createStorage()
    driver.headObject.mockImplementationOnce(async () => {
      throw makeError('NotFound', { statusCode: 404 })
    })

    const result = await storage.exists('missing.txt')
    expect(result.exists).toBe(false)
  })

  it('exists retourne false sur 404 (forme AWS SDK v3)', async () => {
    const { storage, driver } = createStorage()
    driver.headObject.mockImplementationOnce(async () => {
      throw makeError('NotFound', { httpStatusCode: 404 })
    })

    const result = await storage.exists('missing.txt')
    expect(result.exists).toBe(false)
    expect(result.raw).toMatchObject({
      name: 'NotFound',
      $metadata: { httpStatusCode: 404 },
    })
  })

  it('exists retourne true si headObject passe', async () => {
    const { storage } = createStorage()
    const result = await storage.exists('existing.txt')
    expect(result.exists).toBe(true)
  })

  it('getBuffer et get retournent le contenu attendu', async () => {
    const { storage } = createStorage()

    const bufferResult = await storage.getBuffer('file.txt')
    expect(bufferResult.content.equals(Buffer.from('hello'))).toBe(true)

    const textResult = await storage.get('file.txt')
    expect(textResult.content).toBe('hello')
  })

  it('getStat mappe correctement la taille et la date', async () => {
    const { storage, driver } = createStorage()
    const modifiedDate = new Date('2026-01-01T12:00:00.000Z')
    driver.headObject.mockResolvedValueOnce({
      ContentLength: 42,
      LastModified: modifiedDate,
    })

    const stat = await storage.getStat('file.txt')
    expect(stat.size).toBe(42)
    expect(stat.modified).toBe(modifiedDate)
  })

  it('move appelle copy puis delete', async () => {
    const { storage, driver } = createStorage()
    await storage.move('old.txt', 'new.txt')

    expect(driver.copyObject).toHaveBeenCalledTimes(1)
    expect(driver.deleteObject).toHaveBeenCalledTimes(1)
  })

  it('put délègue au driver S3 et attend putObject', async () => {
    const { storage, driver } = createStorage()
    const result = await storage.put('put.txt', 'content')

    expect(driver.putObject).toHaveBeenCalledWith({
      Key: 'put.txt',
      Body: 'content',
      Bucket: 'my-bucket',
    })
    expect(result.raw).toEqual({
      put: {
        Key: 'put.txt',
        Body: 'content',
        Bucket: 'my-bucket',
      },
    })
  })

  it('put propage le rejet de putObject (pas de promesse non gérée)', async () => {
    const { storage, driver } = createStorage()
    driver.putObject.mockImplementationOnce(async () => {
      throw makeError('AccessDenied')
    })

    await expect(storage.put('denied.txt', 'content')).rejects.toBeInstanceOf(UnknownException)
  })

  it('put envoie un Buffer via putObject sans passer par Upload', async () => {
    const { storage, driver } = createStorage()
    const content = Buffer.from('binary content')

    await storage.put('file.bin', content)

    expect(driver.putObject).toHaveBeenCalledWith({
      Key: 'file.bin',
      Body: content,
      Bucket: 'my-bucket',
    })
    expect(Upload).not.toHaveBeenCalled()
  })

  it('put envoie un flux de taille inconnue via Upload (multipart)', async () => {
    const { storage, sent } = createStreamingStorage()
    const stream = Readable.from([Buffer.alloc(3 * MIB, 1), Buffer.alloc(3 * MIB, 2)])

    const result = await storage.put('big.bin', stream)

    expect(Upload).toHaveBeenCalledTimes(1)
    expect(Upload).toHaveBeenCalledWith({
      client: storage.driver(),
      params: { Key: 'big.bin', Body: stream, Bucket: 'my-bucket' },
    })
    expect(sent.map((command) => command.constructor)).toEqual([CreateMultipartUploadCommand, UploadPartCommand, UploadPartCommand, CompleteMultipartUploadCommand])
    const partSizes = sent.filter((command) => command instanceof UploadPartCommand).map((command) => (command.input.Body as Buffer).byteLength)
    expect(partSizes.sort((a, b) => b - a)).toEqual([5 * MIB, MIB])
    expect(result.raw).toMatchObject({ ETag: '"multipart"' })
  })

  it('put envoie un petit flux via Upload en un seul PutObject de taille connue', async () => {
    const { storage, sent } = createStreamingStorage()

    const result = await storage.put('small.txt', Readable.from([Buffer.from('hello '), Buffer.from('world')]))

    expect(sent).toHaveLength(1)
    const [command] = sent
    expect(command).toBeInstanceOf(PutObjectCommand)
    expect((command as PutObjectCommand).input).toMatchObject({ Key: 'small.txt', Bucket: 'my-bucket', Body: Buffer.from('hello world') })
    expect(result.raw).toMatchObject({ ETag: '"single"', Key: 'small.txt', Bucket: 'my-bucket' })
  })

  it('put enveloppe les flux userland qui ne sont pas des Readable natifs', async () => {
    const { storage, sent } = createStreamingStorage()
    const stream = createUserlandStream(Buffer.from('userland'))

    await storage.put('userland.txt', stream)

    const { params } = vi.mocked(Upload).mock.calls[0][0]
    expect(params.Body).toBeInstanceOf(Readable)
    expect(params.Body).not.toBe(stream)
    expect((sent[0] as PutObjectCommand).input.Body).toEqual(Buffer.from('userland'))
  })

  it('put rejette avec une exception Factorydrive si le flux source échoue en cours d’upload', async () => {
    const { storage, sent } = createStreamingStorage()
    const unhandledRejection = vi.fn()
    process.on('unhandledRejection', unhandledRejection)

    async function* failAfterFirstPart() {
      yield Buffer.alloc(6 * MIB)
      throw new Error('source stream failure')
    }

    try {
      const error = await storage.put('broken.bin', Readable.from(failAfterFirstPart())).catch((e: unknown) => e)

      expect(error).toBeInstanceOf(UnknownException)
      expect((error as UnknownException).raw.message).toBe('source stream failure')
      const abort = sent.find((command) => command instanceof AbortMultipartUploadCommand)
      expect(abort?.input).toMatchObject({ Bucket: 'my-bucket', Key: 'broken.bin', UploadId: 'upload-1' })

      await new Promise((resolve) => setImmediate(resolve))
      expect(unhandledRejection).not.toHaveBeenCalled()
    } finally {
      process.off('unhandledRejection', unhandledRejection)
    }
  })

  it('flatList itère sur toutes les pages', async () => {
    const { storage, driver } = createStorage()
    driver.listObjectsV2
      .mockResolvedValueOnce({
        NextContinuationToken: 'token-2',
        Contents: [{ Key: 'a.txt' }],
      })
      .mockResolvedValueOnce({
        NextContinuationToken: undefined,
        Contents: [{ Key: 'b.txt' }],
      })

    const paths: string[] = []
    for await (const item of storage.flatList('prefix/')) {
      paths.push(item.path)
    }

    expect(paths).toEqual(['a.txt', 'b.txt'])
    expect(driver.listObjectsV2).toHaveBeenCalledTimes(2)
  })

  it('mappe les erreurs connues vers les exceptions métier', async () => {
    const { storage, driver } = createStorage()

    driver.copyObject.mockImplementationOnce(async () => {
      throw makeError('NoSuchBucket')
    })
    await expect(storage.copy('a', 'b')).rejects.toBeInstanceOf(NoSuchBucketException)

    driver.deleteObject.mockImplementationOnce(async () => {
      throw makeError('NoSuchKey')
    })
    await expect(storage.delete('missing.txt')).rejects.toBeInstanceOf(FileNotFoundException)

    driver.getObject.mockImplementationOnce(async () => {
      throw makeError('AllAccessDisabled')
    })
    await expect(storage.getBuffer('secret.txt')).rejects.toBeInstanceOf(PermissionMissingException)
  })

  it('mappe les erreurs inconnues vers UnknownException', async () => {
    const { storage, driver } = createStorage()
    driver.copyObject.mockImplementationOnce(async () => {
      throw makeError('WeirdError')
    })

    await expect(storage.copy('a', 'b')).rejects.toBeInstanceOf(UnknownException)
  })
})
