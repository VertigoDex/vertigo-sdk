import type {
  CreateTokenParams,
  CreateTokenResult,
  GetTokenStatusParams,
  TokenApi,
  TokenStatus,
} from './types'

const DEFAULT_API_URL = 'https://api.vertigo.so'
const DEFAULT_TIMEOUT_MS = 30_000

type TokenApiConfig = {
  apiKey: string
  apiUrl?: string
}

const createDefaultTokenApi = (config: TokenApiConfig): TokenApi => {
  const apiUrl = config.apiUrl ?? DEFAULT_API_URL
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'x-api-key': config.apiKey,
  }

  const createToken = async (params: CreateTokenParams): Promise<CreateTokenResult> => {
    const response = await fetch(`${apiUrl}/v1/tokens`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => 'unknown')
      throw new Error(`Token API POST /v1/tokens returned ${response.status}: ${body}`)
    }

    return (await response.json()) as CreateTokenResult
  }

  const getTokenStatus = async (params: GetTokenStatusParams): Promise<TokenStatus> => {
    const response = await fetch(`${apiUrl}/v1/tokens/${params.mint}/status`, {
      headers,
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => 'unknown')
      throw new Error(`Token API GET /v1/tokens/${params.mint}/status returned ${response.status}: ${body}`)
    }

    return (await response.json()) as TokenStatus
  }

  return { createToken, getTokenStatus }
}

export { createDefaultTokenApi }
export type { TokenApiConfig }
