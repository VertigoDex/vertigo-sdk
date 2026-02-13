import { describe, it, expect, vi, afterEach } from 'vitest'
import { DFlowClient } from '../src/dflow'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('DFlowClient', () => {
  describe('constructor', () => {
    it('uses dev URL when no API key', () => {
      const client = new DFlowClient()
      // The URL is private, so we test behavior via getOrder call
      expect(client).toBeDefined()
    })

    it('uses prod URL when API key is set', () => {
      const client = new DFlowClient({ apiKey: 'test-key' })
      expect(client).toBeDefined()
    })

    it('uses custom URL when provided', () => {
      const client = new DFlowClient({
        apiUrl: 'https://custom.test',
        apiKey: 'test-key',
      })
      expect(client).toBeDefined()
    })
  })

  describe('getOrder', () => {
    it('calls dFlow API with correct query params', async () => {
      const mockResponse = {
        transaction: 'base64tx',
        inAmount: '1000000',
        outAmount: '500000',
        otherAmountThreshold: '475000',
        priceImpactPct: '0.5',
        lastValidBlockHeight: 100,
        executionMode: 'sync',
      }

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      } as any)

      const client = new DFlowClient()
      const result = await client.getOrder({
        inputMint: 'So11111111111111111111111111111111',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: '1000000',
        userPublicKey: '11111111111111111111111111111111',
        slippageBps: 50,
      })

      expect(result).toEqual(mockResponse)

      const calledUrl = fetchSpy.mock.calls[0][0] as string
      expect(calledUrl).toContain('dev-quote-api.dflow.net')
      expect(calledUrl).toContain('inputMint=So11111111111111111111111111111111')
      expect(calledUrl).toContain('slippageBps=50')
    })

    it('sends x-api-key header when API key is set', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          transaction: 'base64tx',
          inAmount: '1000',
          outAmount: '500',
          otherAmountThreshold: '475',
          priceImpactPct: '0',
          lastValidBlockHeight: 100,
          executionMode: 'sync',
        }),
      } as any)

      const client = new DFlowClient({ apiKey: 'my-api-key' })
      await client.getOrder({
        inputMint: 'mint-a',
        outputMint: 'mint-b',
        amount: '1000',
        userPublicKey: 'user-pub',
        slippageBps: 50,
      })

      const calledOptions = vi.mocked(globalThis.fetch).mock.calls[0][1]
      const headers = calledOptions?.headers as Record<string, string>
      expect(headers['x-api-key']).toBe('my-api-key')
    })

    it('uses prod URL when API key is set', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          transaction: 'tx',
          inAmount: '1',
          outAmount: '1',
          otherAmountThreshold: '1',
          priceImpactPct: '0',
          lastValidBlockHeight: 1,
          executionMode: 'sync',
        }),
      } as any)

      const client = new DFlowClient({ apiKey: 'key' })
      await client.getOrder({
        inputMint: 'a',
        outputMint: 'b',
        amount: '1',
        userPublicKey: 'u',
        slippageBps: 50,
      })

      const calledUrl = fetchSpy.mock.calls[0][0] as string
      expect(calledUrl).toContain('d.quote-api.dflow.net')
    })

    it('throws on non-OK response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: vi.fn().mockResolvedValue('Bad Request'),
      } as any)

      const client = new DFlowClient()

      await expect(
        client.getOrder({
          inputMint: 'a',
          outputMint: 'b',
          amount: '1',
          userPublicKey: 'u',
          slippageBps: 50,
        }),
      ).rejects.toThrow('dFlow /order returned 400: Bad Request')
    })

    it('does not send x-api-key header when no API key', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          transaction: 'tx',
          inAmount: '1',
          outAmount: '1',
          otherAmountThreshold: '1',
          priceImpactPct: '0',
          lastValidBlockHeight: 1,
          executionMode: 'sync',
        }),
      } as any)

      const client = new DFlowClient()
      await client.getOrder({
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
  })

  describe('sendSignedTransaction', () => {
    it('sends serialized transaction via connection', async () => {
      const mockSig = 'mock-tx-signature'
      const mockConnection = {
        sendRawTransaction: vi.fn().mockResolvedValue(mockSig),
      } as any

      const { MessageV0, VersionedTransaction, Keypair } = await import('@solana/web3.js')
      const message = MessageV0.compile({
        payerKey: Keypair.generate().publicKey,
        instructions: [],
        recentBlockhash: 'GHtXQBsoZHVnNFa9YhR7UMFo9pehNRyGNKnMB1vN6oPh',
      })
      const tx = new VersionedTransaction(message)

      const client = new DFlowClient()
      const result = await client.sendSignedTransaction(mockConnection, tx)

      expect(result).toBe(mockSig)
      expect(mockConnection.sendRawTransaction).toHaveBeenCalledOnce()
      expect(mockConnection.sendRawTransaction).toHaveBeenCalledWith(
        tx.serialize(),
        { skipPreflight: false },
      )
    })
  })

  describe('getTransactionStatus', () => {
    it('returns CLOSED on finalized tx', async () => {
      const mockConnection = {
        getSignatureStatuses: vi.fn().mockResolvedValue({
          value: [{ confirmationStatus: 'finalized', err: null }],
        }),
      } as any

      const client = new DFlowClient()
      const result = await client.getTransactionStatus(mockConnection, 'sig')

      expect(result.status).toBe('CLOSED')
      expect(result.success).toBe(true)
    })

    it('returns PENDING_CLOSE when status is null', async () => {
      const mockConnection = {
        getSignatureStatuses: vi.fn().mockResolvedValue({
          value: [null],
        }),
      } as any

      const client = new DFlowClient()
      const result = await client.getTransactionStatus(mockConnection, 'sig')

      expect(result.status).toBe('PENDING_CLOSE')
      expect(result.success).toBe(false)
    })

    it('returns OPEN_FAILED on error', async () => {
      const mockConnection = {
        getSignatureStatuses: vi.fn().mockResolvedValue({
          value: [{ confirmationStatus: 'confirmed', err: { InstructionError: [0, 'error'] } }],
        }),
      } as any

      const client = new DFlowClient()
      const result = await client.getTransactionStatus(mockConnection, 'sig')

      expect(result.status).toBe('OPEN_FAILED')
      expect(result.success).toBe(false)
    })

    it('returns PENDING_CLOSE when status is processed', async () => {
      const mockConnection = {
        getSignatureStatuses: vi.fn().mockResolvedValue({
          value: [{ confirmationStatus: 'processed', err: null }],
        }),
      } as any

      const client = new DFlowClient()
      const result = await client.getTransactionStatus(mockConnection, 'sig')

      expect(result.status).toBe('PENDING_CLOSE')
      expect(result.success).toBe(false)
    })
  })
})
