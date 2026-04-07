import axios from 'axios'
import { CONFIG } from '../config'
import { updateConfig, loadConfig } from '../store'

interface DeviceCodeResponse {
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
}

interface AccessTokenResponse {
  access_token?: string
  error?: string
  error_description?: string
}

export interface DeviceFlowState {
  userCode: string
  verificationUri: string
  deviceCode: string
  expiresIn: number
}

export async function startDeviceFlow(): Promise<DeviceFlowState> {
  const resp = await axios.post<DeviceCodeResponse>(
    CONFIG.api.copilot.deviceCode,
    new URLSearchParams({
      client_id: CONFIG.api.copilot.clientId,
      scope: CONFIG.api.copilot.scope,
    }),
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  )

  const { device_code, user_code, verification_uri, expires_in, interval } = resp.data
  return { userCode: user_code, verificationUri: verification_uri, deviceCode: device_code, expiresIn: expires_in }
}

export async function pollForToken(deviceCode: string, intervalSecs: number = 5): Promise<string> {
  const deadline = Date.now() + 15 * 60 * 1000 // 15 min timeout

  while (Date.now() < deadline) {
    await sleep(intervalSecs * 1000)

    const resp = await axios.post<AccessTokenResponse>(
      CONFIG.api.copilot.accessToken,
      new URLSearchParams({
        client_id: CONFIG.api.copilot.clientId,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    const { access_token, error } = resp.data

    if (access_token) {
      // Salva o token no config
      updateConfig({ copilotToken: access_token })
      return access_token
    }

    if (error && error !== 'authorization_pending') {
      throw new Error(`Device flow error: ${error}`)
    }
  }

  throw new Error('Device flow timed out (15 min)')
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export function getSavedCopilotToken(): string | null {
  return loadConfig().copilotToken || null
}
