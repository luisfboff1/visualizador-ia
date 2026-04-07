import fs from 'fs'
import path from 'path'
import sqlite3 from 'sqlite3'
import { CONFIG } from '../config'

interface RawCookie {
  name: string
  value: Buffer | string
  encrypted_value: Buffer
  host_key: string
  path: string
  expires_utc: number
  is_secure: number
}

// Tenta importar dpapi nativo (Windows only)
// Se não disponível, usa decifragem AES baseada em chrome-cookies-secure
async function getChromeCookies(domain: string, cookieName: string): Promise<string | null> {
  try {
    // Tenta via chrome-cookies-secure que lida com DPAPI automaticamente no Windows
    const chromeCookies = require('chrome-cookies-secure')
    return new Promise((resolve) => {
      chromeCookies.getCookies(`https://${domain}`, 'header', (err: Error | null, cookies: string) => {
        if (err) {
          console.warn('[chromeCookies] chrome-cookies-secure error:', err.message)
          resolve(null)
          return
        }
        // cookies é uma string "name=value; name2=value2"
        const match = cookies.match(new RegExp(`${cookieName}=([^;]+)`))
        resolve(match ? match[1] : null)
      }, path.join(CONFIG.paths.chrome.userData, 'Default'))
    })
  } catch (e) {
    console.warn('[chromeCookies] Failed to use chrome-cookies-secure:', e)
    return null
  }
}

async function getEdgeCookies(domain: string, cookieName: string): Promise<string | null> {
  try {
    const chromeCookies = require('chrome-cookies-secure')
    return new Promise((resolve) => {
      chromeCookies.getCookies(`https://${domain}`, 'header', (err: Error | null, cookies: string) => {
        if (err) { resolve(null); return }
        const match = cookies.match(new RegExp(`${cookieName}=([^;]+)`))
        resolve(match ? match[1] : null)
      }, path.join(CONFIG.paths.edge.userData, 'Default'))
    })
  } catch {
    return null
  }
}

// Tenta Chrome primeiro, depois Edge
export async function getClaudeSessionKey(): Promise<string | null> {
  const fromChrome = await getChromeCookies('claude.ai', 'sessionKey')
  if (fromChrome && fromChrome.startsWith('sk-ant-')) return fromChrome

  const fromEdge = await getEdgeCookies('claude.ai', 'sessionKey')
  if (fromEdge && fromEdge.startsWith('sk-ant-')) return fromEdge

  return null
}
