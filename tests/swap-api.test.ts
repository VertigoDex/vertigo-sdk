import { describe, it, expect, vi, afterEach } from 'vitest'
import { createDFlowSwapApi } from '../src/swap-api'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createDFlowSwapApi', () => {
  describe('configuration', () => {
    it('uses dev URL when no API key', async () => {
      const mockResponse = {
        transaction: 'base64tx',
        outAmount: '500',
        otherAmountThreshold: '475',
        priceImpactPct: '0',
      }

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      } as any)

      const api = createDFlowSwapApi()
      await api.getSwapTransaction({
        inputMint: 'mint-a',
        outputMint: 'mint-b',
        amount: '1000',
        userPublicKey: 'user',
        slippageBps: 50,
      })

      const calledUrl = fetchSpy.mock.calls[0][0] as string
      expect(calledUrl).toContain('dev-quote-api.dflow.net')
    })

    it('uses prod URL when API key is set', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          transaction: 'tx',
          outAmount: '1',
          otherAmountThreshold: '1',
          priceImpactPct: '0',
        }),
      } as any)

      const api = createDFlowSwapApi({ apiKey: 'test-key' })
      await api.getSwapTransaction({
        inputMint: 'a',
        outputMint: 'b',
        amount: '1',
        userPublicKey: 'u',
        slippageBps: 50,
      })

      const calledUrl = fetchSpy.mock.calls[0][0] as string
      expect(calledUrl).toContain('d.quote-api.dflow.net')
    })

    it('uses custom URL when provided', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          transaction: 'tx',
          outAmount: '1',
          otherAmountThreshold: '1',
          priceImpactPct: '0',
        }),
      } as any)

      const api = createDFlowSwapApi({ apiUrl: 'https://custom.test', apiKey: 'key' })
      await api.getSwapTransaction({
        inputMint: 'a',
        outputMint: 'b',
        amount: '1',
        userPublicKey: 'u',
        slippageBps: 50,
      })

      const calledUrl = fetchSpy.mock.calls[0][0] as string
      expect(calledUrl).toContain('custom.test')
    })
  })

  describe('getSwapTransaction', () => {
    it('sends correct query params', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          transaction: 'base64tx',
          outAmount: '500000',
          otherAmountThreshold: '475000',
          priceImpactPct: '0.5',
        }),
      } as any)

      const api = createDFlowSwapApi()
      await api.getSwapTransaction({
        inputMint: 'So11111111111111111111111111111111',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: '1000000',
        userPublicKey: '11111111111111111111111111111111',
        slippageBps: 50,
      })

      const calledUrl = fetchSpy.mock.calls[0][0] as string
      expect(calledUrl).toContain('inputMint=So11111111111111111111111111111111')
      expect(calledUrl).toContain('outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
      expect(calledUrl).toContain('amount=1000000')
      expect(calledUrl).toContain('slippageBps=50')
    })

    it('maps dFlow response to SwapRouteResult', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          transaction: 'base64tx',
          outAmount: '500000',
          otherAmountThreshold: '475000',
          priceImpactPct: '0.5',
          lastValidBlockHeight: 100,
          executionMode: 'sync',
        }),
      } as any)

      const api = createDFlowSwapApi()
      const result = await api.getSwapTransaction({
        inputMint: 'a',
        outputMint: 'b',
        amount: '1000',
        userPublicKey: 'u',
        slippageBps: 50,
      })

      expect(result).toEqual({
        transaction: 'base64tx',
        expectedOutput: '500000',
        minimumOutput: '475000',
        priceImpact: '0.5',
      })
    })

    it('sends x-api-key header when API key is set', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          transaction: 'tx',
          outAmount: '1',
          otherAmountThreshold: '1',
          priceImpactPct: '0',
        }),
      } as any)

      const api = createDFlowSwapApi({ apiKey: 'my-api-key' })
      await api.getSwapTransaction({
        inputMint: 'a',
        outputMint: 'b',
        amount: '1',
        userPublicKey: 'u',
        slippageBps: 50,
      })

      const calledOptions = vi.mocked(globalThis.fetch).mock.calls[0][1]
      const headers = calledOptions?.headers as Record<string, string>
      expect(headers['x-api-key']).toBe('my-api-key')
    })

    it('does not send x-api-key header when no API key', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          transaction: 'tx',
          outAmount: '1',
          otherAmountThreshold: '1',
          priceImpactPct: '0',
        }),
      } as any)

      const api = createDFlowSwapApi()
      await api.getSwapTransaction({
        inputMint: 'a',
        outputMint: 'b',
        amount: '1',
        userPublicKey: 'u',
        slippageBps: 50,
      })

      const calledOptions = vi.mocked(globalThis.fetch).mock.calls[0][1]
      const headers = calledOptions?.headers as Record<string, string>
      expect(headers['x-api-key']).toBeUndefined()
    })

    it('throws on non-OK response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: vi.fn().mockResolvedValue('Bad Request'),
      } as any)

      const api = createDFlowSwapApi()

      await expect(
        api.getSwapTransaction({
          inputMint: 'a',
          outputMint: 'b',
          amount: '1',
          userPublicKey: 'u',
          slippageBps: 50,
        }),
      ).rejects.toThrow('dFlow /order returned 400: Bad Request')
    })
  })
})
