import type {
  CreateTokenParams,
  CreateTokenResult,
  GetTokenStatusParams,
  TokenApi,
  TokenStatus,
} from './types'

const DEFAULT_API_URL = 'https://api.vertigo.so'
const DEFAULT_TIMEOUT_MS = 30_000

const isCreateTokenResult = (data: unknown): data is CreateTokenResult =>
  typeof data === 'object'
  && data !== null
  && typeof (data as Record<string, unknown>).transaction === 'string'
  && typeof (data as Record<string, unknown>).mint === 'string'
  && typeof (data as Record<string, unknown>).pool === 'string'

const VALID_TOKEN_STATUSES = new Set(['pending', 'indexed', 'failed'])

const isTokenStatus = (data: unknown): data is TokenStatus =>
  typeof data === 'object'
  && data !== null
  && VALID_TOKEN_STATUSES.has((data as Record<string, unknown>).status as string)
  && typeof (data as Record<string, unknown>).indexed === 'boolean'

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

    const data: unknown = await response.json()

    if (!isCreateTokenResult(data)) {
      throw new Error('Token API POST /v1/tokens returned an unexpected response shape')
    }

    return data
  }

  const getTokenStatus = async (params: GetTokenStatusParams): Promise<TokenStatus> => {
    const response = await fetch(`${apiUrl}/v1/tokens/${params.mint}/status`, {
      headers: { 'x-api-key': config.apiKey },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => 'unknown')
      throw new Error(`Token API GET /v1/tokens/${params.mint}/status returned ${response.status}: ${body}`)
    }

    const data: unknown = await response.json()

    if (!isTokenStatus(data)) {
      throw new Error(`Token API GET /v1/tokens/${params.mint}/status returned an unexpected response shape`)
    }

    return data
  }

  return { createToken, getTokenStatus }
}

export { createDefaultTokenApi }
export type { TokenApiConfig }
