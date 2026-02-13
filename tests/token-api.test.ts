import { describe, it, expect, vi, afterEach } from 'vitest'
import { createDefaultTokenApi } from '../src/token-api'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createDefaultTokenApi', () => {
  describe('createToken', () => {
    it('sends POST to /v1/tokens with correct body and headers', async () => {
      const mockResult = {
        transaction: 'base64tx',
        mint: 'mint-address',
        pool: 'pool-address',
        metadataUri: 'https://arweave.net/abc',
      }

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResult),
      } as any)

      const api = createDefaultTokenApi({ apiKey: 'test-key' })
      const params = {
        payer: 'payer-pubkey',
        metadata: {
          name: 'Test Token',
          symbol: 'TEST',
          description: 'A test token',
          image: 'data:image/png;base64,abc',
        },
        poolConfig: {
          shift: '1000000',
          initialTokenBReserves: '1000000000',
          feeParams: {
            normalizationPeriod: '600',
            decay: 0.5,
            royaltiesBps: 250,
            privilegedSwapper: null,
            reference: '0',
          },
        },
      }

      const result = await api.createToken(params)

      expect(result).toEqual(mockResult)

      const calledUrl = fetchSpy.mock.calls[0][0] as string
      expect(calledUrl).toBe('https://api.vertigo.so/v1/tokens')

      const calledOptions = fetchSpy.mock.calls[0][1] as RequestInit
      expect(calledOptions.method).toBe('POST')

      const headers = calledOptions.headers as Record<string, string>
      expect(headers['Content-Type']).toBe('application/json')
      expect(headers['x-api-key']).toBe('test-key')

      const body = JSON.parse(calledOptions.body as string)
      expect(body.payer).toBe('payer-pubkey')
      expect(body.metadata.name).toBe('Test Token')
      expect(body.poolConfig.shift).toBe('1000000')
    })

    it('uses custom API URL when provided', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          transaction: 'tx',
          mint: 'mint',
          pool: 'pool',
        }),
      } as any)

      const api = createDefaultTokenApi({
        apiKey: 'key',
        apiUrl: 'https://custom-api.test',
      })

      await api.createToken({
        payer: 'payer',
        metadata: { name: 'T', symbol: 'T', description: '', image: '' },
        poolConfig: {
          shift: '0',
          initialTokenBReserves: '0',
          feeParams: { normalizationPeriod: '0', decay: 0, royaltiesBps: 0, reference: '0' },
        },
      })

      const calledUrl = fetchSpy.mock.calls[0][0] as string
      expect(calledUrl).toBe('https://custom-api.test/v1/tokens')
    })

    it('throws on non-OK response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: vi.fn().mockResolvedValue('Unauthorized'),
      } as any)

      const api = createDefaultTokenApi({ apiKey: 'bad-key' })

      await expect(
        api.createToken({
          payer: 'payer',
          metadata: { name: 'T', symbol: 'T', description: '', image: '' },
          poolConfig: {
            shift: '0',
            initialTokenBReserves: '0',
            feeParams: { normalizationPeriod: '0', decay: 0, royaltiesBps: 0, reference: '0' },
          },
        }),
      ).rejects.toThrow('Token API POST /v1/tokens returned 401: Unauthorized')
    })
  })

  describe('getTokenStatus', () => {
    it('sends GET to /v1/tokens/:mint/status', async () => {
      const mockStatus = { status: 'indexed', indexed: true, pool: 'pool-addr' }

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockStatus),
      } as any)

      const api = createDefaultTokenApi({ apiKey: 'test-key' })
      const result = await api.getTokenStatus({ mint: 'mint-abc' })

      expect(result).toEqual(mockStatus)

      const calledUrl = fetchSpy.mock.calls[0][0] as string
      expect(calledUrl).toBe('https://api.vertigo.so/v1/tokens/mint-abc/status')

      const calledOptions = fetchSpy.mock.calls[0][1] as RequestInit
      const headers = calledOptions.headers as Record<string, string>
      expect(headers['x-api-key']).toBe('test-key')
    })

    it('throws on non-OK response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: vi.fn().mockResolvedValue('Not Found'),
      } as any)

      const api = createDefaultTokenApi({ apiKey: 'key' })

      await expect(
        api.getTokenStatus({ mint: 'unknown-mint' }),
      ).rejects.toThrow('Token API GET /v1/tokens/unknown-mint/status returned 404: Not Found')
    })
  })
})
