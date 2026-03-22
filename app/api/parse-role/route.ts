import { NextRequest } from 'next/server'
import anthropic from '@/lib/anthropic'
import type { RoleBrief } from '@/types/agent'

export const runtime = 'nodejs'

const SYSTEM_PROMPT =
  'You are a recruitment assistant. Extract a structured role brief from the provided text. ' +
  'If content fetched from URLs is provided, use it as the primary source for extracting role details. ' +
  'Return ONLY valid JSON with exactly these fields: ' +
  'title (string, the job title or role being hired for), ' +
  'skills (string[], required technical skills or competencies — can be empty array if none mentioned), ' +
  'location (string | null, city and/or country if mentioned, otherwise null), ' +
  'experienceLevel (string | null, seniority or years of experience if mentioned, e.g. "Senior", "5+ years", otherwise null), ' +
  'summary (string, 1-2 concise sentences describing what they are looking for). ' +
  'Do not include any explanation, markdown, or extra text — return only the raw JSON object.'

const URL_RE = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi

async function fetchUrlText(url: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Wone/1.0)' },
    })
    if (!res.ok) return ''
    const html = await res.text()
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000)
  } catch {
    return ''
  } finally {
    clearTimeout(timer)
  }
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

  try {
    const urls = [...new Set(text.match(URL_RE) ?? [])]
    let contextText = text.trim()

    if (urls.length > 0) {
      const fetched = await Promise.allSettled(urls.map(fetchUrlText))
      for (let i = 0; i < urls.length; i++) {
        const result = fetched[i]
        if (result.status === 'fulfilled' && result.value) {
          contextText += `\n\n[Content from ${urls[i]}]:\n${result.value}`
        }
      }
    }

    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: contextText }],
    })

    let rawText = ''
    for (const block of response.content) {
      if (block.type === 'text') rawText += block.text
    }
    rawText = rawText.trim()

    // Strip markdown code fences if present
    const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    let brief: RoleBrief
    try {
      brief = JSON.parse(jsonText)
    } catch {
      return Response.json({ error: 'Failed to parse role brief from response' }, { status: 500 })
    }

    // Normalise: ensure required fields exist
    if (typeof brief.title !== 'string' || !brief.title) {
      return Response.json({ error: 'Could not extract a role title from the provided text' }, { status: 422 })
    }
    brief.skills = Array.isArray(brief.skills) ? brief.skills.filter((s) => typeof s === 'string') : []
    brief.location = typeof brief.location === 'string' ? brief.location : null
    brief.experienceLevel = typeof brief.experienceLevel === 'string' ? brief.experienceLevel : null
    brief.summary = typeof brief.summary === 'string' ? brief.summary : ''

    return Response.json({ brief })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
