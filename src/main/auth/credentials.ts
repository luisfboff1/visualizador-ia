import fs from 'fs'
import path from 'path'
import { CONFIG } from '../config'

// Formato normalizado retornado pelos leitores
export interface ClaudeCredentials {
  access_token: string
  org_id?: string
}

export interface CodexAuth {
  access_token: string
}

// Formato real do arquivo ~/.claude/.credentials.json (Claude CLI / Claude app)
interface ClaudeRawFile {
  claudeAiOauth?: {
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
    subscriptionType?: string
  }
  // formato legado (versões antigas do CLI)
  access_token?: string
  organizationUuid?: string
}

// Formato real do arquivo ~/.codex/auth.json
interface CodexRawFile {
  tokens?: {
    access_token?: string
    id_token?: string
    refresh_token?: string
    account_id?: string
  }
  // fallback: token na raiz (versões antigas)
  access_token?: string
  token?: string
}

function tryReadJson<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function parseClaudeFile(raw: ClaudeRawFile | null): ClaudeCredentials | null {
  if (!raw) return null
  // Formato atual: claudeAiOauth.accessToken
  const token = raw.claudeAiOauth?.accessToken || raw.access_token
  if (!token) return null
  return { access_token: token, org_id: raw.organizationUuid }
}

function parseCodexFile(raw: CodexRawFile | null): CodexAuth | null {
  if (!raw) return null
  // Formato atual: tokens.access_token
  const token = raw.tokens?.access_token || raw.access_token || raw.token
  if (!token) return null
  return { access_token: token }
}

export function readClaudeCredentials(): ClaudeCredentials | null {
  const primary = parseClaudeFile(tryReadJson<ClaudeRawFile>(CONFIG.paths.claude.credentials))
  if (primary) return primary

  const fallback = parseClaudeFile(tryReadJson<ClaudeRawFile>(CONFIG.paths.claude.credentialsFallback))
  return fallback
}

export function readCodexAuth(): CodexAuth | null {
  const primary = parseCodexFile(tryReadJson<CodexRawFile>(CONFIG.paths.codex.auth))
  if (primary) return primary

  const fallback = parseCodexFile(tryReadJson<CodexRawFile>(CONFIG.paths.codex.authFallback))
  return fallback
}

export function getCodexToken(auth: CodexAuth): string | null {
  return auth.access_token
}
