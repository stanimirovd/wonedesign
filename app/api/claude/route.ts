import { NextRequest } from 'next/server'
import anthropic from '@/lib/anthropic'
import { TOOL_DEFINITIONS, TOOL_LABELS } from '@/lib/tools'
import { executeCustomTool } from '@/lib/executeTools'
import type {
  BetaMessageParam,
  BetaToolResultBlockParam,
} from '@anthropic-ai/sdk/resources/beta/messages/messages'
import type { CandidateProfile } from '@/types/agent'

export const runtime = 'nodejs'

const SYSTEM_PROMPT =
  'You are a helpful voice assistant with two special capabilities: ' +
  '(1) Web search — you can look up current information, news, weather, and facts. ' +
  '(2) User profile database — you have access to 100 professional profiles with CVs and work experience; use search_users to find people by skills, location, role, or company, and get_user to fetch a full profile by ID. ' +
  'Keep responses concise (under 4 sentences for voice output) unless the user asks for more detail. ' +
  'Respond naturally as if speaking aloud. When you use tools, briefly summarize what you found. ' +
  'IMPORTANT: When returning user profile results, keep your spoken response to a single short sentence ' +
  '(e.g. "I found 3 React developers in Berlin." or "Here is the profile for Ana Kovač."). ' +
  'The UI will display the full profile cards — do NOT list out skills, experience, or other details in your spoken response.'

const MAX_ITERATIONS = 5

function extractCandidates(toolName: string, result: string): CandidateProfile[] {
  try {
    const parsed = JSON.parse(result)
    if (toolName === 'search_users') {
      return (parsed.results ?? []) as CandidateProfile[]
    }
    if (toolName === 'get_user' && !parsed.error) {
      return [
        {
          id: parsed.id,
          name: parsed.name,
          role: parsed.role,
          location: parsed.location,
          skills: parsed.skills ?? [],
          summary: parsed.summary ?? '',
          currentCompany: parsed.experience?.[0]?.company ?? null,
          totalExperiences: parsed.experience?.length ?? 0,
          education: parsed.education,
          languages: parsed.languages,
        },
      ]
    }
  } catch {
    // ignore
  }
  return []
}

export async function POST(req: NextRequest) {
  let message: string

  try {
    const body = await req.json()
    message = body?.message
    if (!message || typeof message !== 'string' || !message.trim()) {
      return new Response(JSON.stringify({ error: 'message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
      }

      try {
        const messages: BetaMessageParam[] = [{ role: 'user', content: message }]

        for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
          const response = await anthropic.beta.messages.create({
            model: process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6',
            max_tokens: 1024,
            system: SYSTEM_PROMPT,
            tools: TOOL_DEFINITIONS,
            messages,
            betas: ['web-search-2025-03-05'],
          })

          const toolResults: BetaToolResultBlockParam[] = []
          let hasCustomToolUse = false

          for (const block of response.content) {
            if (block.type === 'text') {
              const text = block.text
              for (let i = 0; i < text.length; i += 30) {
                send({ type: 'delta', text: text.slice(i, i + 30) })
              }
            } else if (block.type === 'server_tool_use') {
              const label = TOOL_LABELS[block.name] ?? `Using ${block.name}…`
              send({ type: 'tool_use', name: block.name, label })
            } else if (block.type === 'tool_use') {
              const label = TOOL_LABELS[block.name] ?? `Using ${block.name}…`
              send({ type: 'tool_use', name: block.name, label })

              const result = executeCustomTool(
                block.name,
                block.input as Record<string, unknown>,
              )

              // Emit candidate profiles as a dedicated event so the client can
              // render UI cards — these never enter streamedResponse / TTS
              if (block.name === 'search_users' || block.name === 'get_user') {
                const profiles = extractCandidates(block.name, result)
                if (profiles.length > 0) {
                  send({ type: 'candidates', profiles })
                }
              }

              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: result,
              })
              hasCustomToolUse = true
            }
          }

          if (response.stop_reason === 'end_turn' || !hasCustomToolUse) {
            break
          }

          messages.push({ role: 'assistant', content: response.content })
          messages.push({ role: 'user', content: toolResults })
        }

        send({ type: 'done' })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        send({ type: 'error', message: msg })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
