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
  ' Fetched page content is included below the URL if available — use it as the primary source. ' +
  'Use the web_search tool only if the fetched content is missing or clearly insufficient. ' +
  'IMPORTANT: You MUST always respond with only a valid JSON object — no explanatory text, ' +
  'no apologies, no markdown. If the linked page cannot be accessed or contains insufficient ' +
  'information, return exactly: ' +
  '{"title":"","skills":[],"location":null,"experienceLevel":null,"summary":""}.'

// Recursively collect non-trivial string values from a parsed JSON tree
function extractStrings(value: unknown, depth = 0): string[] {
  if (depth > 12) return []
  if (typeof value === 'string' && value.trim().length > 3) return [value.trim()]
  if (Array.isArray(value)) return value.flatMap((v) => extractStrings(v, depth + 1))
  if (value && typeof value === 'object')
    return Object.values(value as Record<string, unknown>).flatMap((v) =>
      extractStrings(v, depth + 1),
    )
  return []
}

async function fetchUrlContent(url: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Identify as Googlebot so sites don't block the request
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    })
    if (!res.ok) return ''
    const html = await res.text()
    const parts: string[] = []

    // 1. Next.js __NEXT_DATA__ — Notion, Greenhouse, Lever, Ashby and many modern job boards
    //    embed their full page content here, readable without JS execution
    const nextDataMatch = html.match(
      /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i,
    )
    if (nextDataMatch) {
      try {
        const data = JSON.parse(nextDataMatch[1])
        const text = extractStrings(data).join(' ').replace(/\s+/g, ' ').trim()
        if (text.length > 200) parts.push(text.slice(0, 4000))
      } catch {
        /* ignore parse errors */
      }
    }

    // 2. <title> tag
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (titleMatch) parts.push(titleMatch[1].trim())

    // 3. OpenGraph and meta description tags
    for (const m of html.matchAll(
      /<meta[^>]+(?:property|name)="(?:og:title|og:description|description|twitter:title|twitter:description)"[^>]+content="([^"]+)"/gi,
    )) {
      parts.push(m[1])
    }

    // 4. JSON-LD structured data
    for (const m of html.matchAll(
      /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
    )) {
      parts.push(m[1].slice(0, 1000))
    }

    if (parts.length === 0) {
      // Last resort: strip all tags and return visible text
      return html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 3000)
    }

    return parts.join('\n').slice(0, 4000)
  } catch {
    return ''
  } finally {
    clearTimeout(timer)
  }
}

function extractBrief(rawText: string): RoleBrief | null {
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
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
      URL_RE.lastIndex = 0
      const urls = [...new Set(text.match(URL_RE) ?? [])]
      URL_RE.lastIndex = 0

      // Layer 1: direct HTTP fetch — extracts __NEXT_DATA__, meta/og tags, JSON-LD
      const fetchResults = await Promise.all(urls.map(fetchUrlContent))
      const fetchedParts = fetchResults
        .map((content, i) => (content ? `[Content from ${urls[i]}]:\n${content}` : ''))
        .filter(Boolean)

      // Layer 2: send to Claude — if direct fetch got content, Claude uses it;
      // if sparse, Claude can supplement via web_search
      const contextText =
        fetchedParts.length > 0
          ? `${text.trim()}\n\n${fetchedParts.join('\n\n')}`
          : text.trim()

      const response = await anthropic.beta.messages.create({
        model: process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: URL_SYSTEM,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: contextText }],
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
        {
          error: hasUrls
            ? 'Could not read this link — it may be private or require a login. Try pasting the job description text directly.'
            : 'Could not extract a role title from the provided text.',
        },
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
