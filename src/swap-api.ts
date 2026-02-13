import type { SwapApi, SwapRouteParams, SwapRouteResult } from './types'

const DFLOW_PROD_URL = 'https://d.quote-api.dflow.net'
const DFLOW_DEV_URL = 'https://dev-quote-api.dflow.net'
const DEFAULT_TIMEOUT_MS = 10_000

type DFlowSwapApiConfig = {
  apiKey?: string
  apiUrl?: string
}

const createDFlowSwapApi = (config: DFlowSwapApiConfig = {}): SwapApi => {
  const apiKey = config.apiKey
  const apiUrl = config.apiUrl || (apiKey ? DFLOW_PROD_URL : DFLOW_DEV_URL)

  const getSwapTransaction = async (params: SwapRouteParams): Promise<SwapRouteResult> => {
    const queryParams = new URLSearchParams({
      inputMint: params.inputMint,
      outputMint: params.outputMint,
      amount: params.amount,
      userPublicKey: params.userPublicKey,
      slippageBps: params.slippageBps.toString(),
    })

    const url = `${apiUrl}/order?${queryParams.toString()}`

    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    if (apiKey) {
      headers['x-api-key'] = apiKey
    }

    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => 'unknown')
      throw new Error(`dFlow /order returned ${response.status}: ${body}`)
    }

    const data = (await response.json()) as {
      transaction: string
      outAmount: string
      otherAmountThreshold: string
      priceImpactPct: string
      [key: string]: unknown
    }

    return {
      transaction: data.transaction,
      expectedOutput: data.outAmount,
      minimumOutput: data.otherAmountThreshold,
      priceImpact: data.priceImpactPct,
    }
  }

  return { getSwapTransaction }
}

export { createDFlowSwapApi }
export type { DFlowSwapApiConfig }
