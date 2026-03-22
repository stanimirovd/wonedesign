import { NextRequest } from 'next/server'
import anthropic from '@/lib/anthropic'
import type { RoleBrief } from '@/types/agent'

export const runtime = 'nodejs'

const URL_RE = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi

const BASE_SYSTEM =
  'You are a recruitment assistant. Extract a structured role brief from the provided content. ' +
  'Return ONLY valid JSON (no markdown, no extra text) with exactly these fields: ' +
  'title (string, the job title or role being hired for), ' +
  'skills (string[], required technical skills or competencies — empty array if none mentioned), ' +
  'location (string | null, city and/or country if mentioned, otherwise null), ' +
  'experienceLevel (string | null, seniority or years of experience if mentioned, e.g. "Senior", "5+ years", otherwise null), ' +
  'summary (string, 1-2 concise sentences describing what they are looking for).'

const URL_SYSTEM =
  BASE_SYSTEM +
  ' URLs are present in the input — use the web_search tool to fetch and read each one, ' +
  'then extract the role brief from the retrieved content.'

function extractBrief(rawText: string): RoleBrief | null {
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  // Try the full text first, then fall back to extracting a JSON object within it
  for (const attempt of [cleaned, cleaned.match(/\{[\s\S]*\}/)?.[0] ?? '']) {
    if (!attempt) continue
    try {
      const parsed = JSON.parse(attempt)
      if (typeof parsed?.title !== 'string' || !parsed.title) continue
      return {
        title: parsed.title,
        skills: Array.isArray(parsed.skills)
          ? (parsed.skills as unknown[]).filter((s): s is string => typeof s === 'string')
          : [],
        location: typeof parsed.location === 'string' ? parsed.location : null,
        experienceLevel:
          typeof parsed.experienceLevel === 'string' ? parsed.experienceLevel : null,
        summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      }
    } catch {
      /* try next */
    }
  }
  return null
}

export async function POST(req: NextRequest) {
  let text: string

  try {
    const body = await req.json()
    text = body?.text
    if (!text || typeof text !== 'string' || !text.trim()) {
      return Response.json({ error: 'text is required' }, { status: 400 })
    }
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  URL_RE.lastIndex = 0
  const hasUrls = URL_RE.test(text)
  URL_RE.lastIndex = 0

  try {
    let rawText = ''

    if (hasUrls) {
      // Let Claude fetch the URLs using the web_search server tool.
      // Server tools run transparently within a single API call — stop_reason is end_turn when done.
      const response = await anthropic.beta.messages.create({
        model: process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: URL_SYSTEM,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: text.trim() }],
        betas: ['web-search-2025-03-05'],
      })
      for (const block of response.content) {
        if (block.type === 'text') rawText += block.text
      }
    } else {
      const response = await anthropic.messages.create({
        model: process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6',
        max_tokens: 512,
        system: BASE_SYSTEM,
        messages: [{ role: 'user', content: text.trim() }],
      })
      for (const block of response.content) {
        if (block.type === 'text') rawText += block.text
      }
    }

    const brief = extractBrief(rawText.trim())
    if (!brief) {
      return Response.json(
        { error: 'Could not extract a role title from the provided text' },
        { status: 422 },
      )
    }
    return Response.json({ brief })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
