import type { AttachedFile, CandidateProfile, ConversationTurn } from '@/types/agent'

interface StreamCallbacks {
  onChunk: (text: string) => void
  onDone: (responseText: string) => void
  onError: (msg: string) => void
  onToolUse?: (label: string) => void
  onCandidates?: (profiles: CandidateProfile[]) => void
}

export async function fetchClaudeStream(
  message: string,
  history: ConversationTurn[],
  attachment: AttachedFile | null,
  { onChunk, onDone, onError, onToolUse, onCandidates }: StreamCallbacks,
) {
  try {
    const body: Record<string, unknown> = { message, history }
    if (attachment) {
      body.attachment = { name: attachment.name, mediaType: attachment.mediaType, data: attachment.data }
    }
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      onError(`API error ${res.status}: ${text}`)
      return
    }

    const reader = res.body?.getReader()
    if (!reader) {
      onError('No response body')
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let accumulatedResponse = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      const parts = buffer.split('\n\n')
      buffer = parts.pop() ?? ''

      for (const part of parts) {
        const line = part.trim()
        if (!line.startsWith('data: ')) continue
        const json = line.slice(6)
        try {
          const event = JSON.parse(json)
          if (event.type === 'delta' && event.text) {
            accumulatedResponse += event.text
            onChunk(event.text)
          } else if (event.type === 'tool_use' && event.label) {
            onToolUse?.(event.label)
          } else if (event.type === 'candidates' && Array.isArray(event.profiles)) {
            onCandidates?.(event.profiles)
          } else if (event.type === 'done') {
            onDone(accumulatedResponse)
            return
          } else if (event.type === 'error') {
            onError(event.message ?? 'Unknown error')
            return
          }
        } catch {
          // ignore malformed JSON lines
        }
      }
    }

    onDone(accumulatedResponse)
  } catch (err) {
    onError(err instanceof Error ? err.message : 'Network error')
  }
}
