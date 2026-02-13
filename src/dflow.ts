import { Connection, VersionedTransaction } from '@solana/web3.js'

const DFLOW_PROD_URL = 'https://d.quote-api.dflow.net'
const DFLOW_DEV_URL = 'https://dev-quote-api.dflow.net'
const DEFAULT_TIMEOUT_MS = 10_000

type DFlowConfig = {
  apiKey?: string
  apiUrl?: string
}

type DFlowOrderParams = {
  inputMint: string
  outputMint: string
  amount: string
  userPublicKey: string
  slippageBps: number
}

type DFlowOrderResponse = {
  transaction: string
  inAmount: string
  outAmount: string
  otherAmountThreshold: string
  priceImpactPct: string
  lastValidBlockHeight: number
  executionMode: 'sync' | 'async'
  [key: string]: unknown
}

type DFlowOrderStatus = 'CLOSED' | 'PENDING_CLOSE' | 'OPEN_EXPIRED' | 'OPEN_FAILED'

class DFlowClient {
  private readonly apiUrl: string
  private readonly apiKey?: string

  constructor(config: DFlowConfig = {}) {
    this.apiKey = config.apiKey
    this.apiUrl = config.apiUrl || (config.apiKey ? DFLOW_PROD_URL : DFLOW_DEV_URL)
  }

  async getOrder(params: DFlowOrderParams): Promise<DFlowOrderResponse> {
    const queryParams = new URLSearchParams({
      inputMint: params.inputMint,
      outputMint: params.outputMint,
      amount: params.amount,
      userPublicKey: params.userPublicKey,
      slippageBps: params.slippageBps.toString(),
    })

    const url = `${this.apiUrl}/order?${queryParams.toString()}`

    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey
    }

    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => 'unknown')
      throw new Error(`dFlow /order returned ${response.status}: ${body}`)
    }

    return (await response.json()) as DFlowOrderResponse
  }

  async sendSignedTransaction(
    connection: Connection,
    signedTx: VersionedTransaction,
  ): Promise<string> {
    return connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: false,
    })
  }

  async getTransactionStatus(
    connection: Connection,
    signature: string,
  ): Promise<{ status: DFlowOrderStatus; success: boolean }> {
    const resp = await connection.getSignatureStatuses([signature], {
      searchTransactionHistory: true,
    })

    const result = resp.value[0]

    if (!result) {
      return { status: 'PENDING_CLOSE', success: false }
    }

    if (result.err) {
      return { status: 'OPEN_FAILED', success: false }
    }

    if (
      result.confirmationStatus === 'confirmed' ||
      result.confirmationStatus === 'finalized'
    ) {
      return { status: 'CLOSED', success: true }
    }

    return { status: 'PENDING_CLOSE', success: false }
  }
}

export { DFlowClient }
export type { DFlowConfig, DFlowOrderParams, DFlowOrderResponse, DFlowOrderStatus }
