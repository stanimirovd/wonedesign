interface StreamCallbacks {
  onChunk: (text: string) => void
  onDone: () => void
  onError: (msg: string) => void
  onToolUse?: (label: string) => void
}

export async function fetchClaudeStream(
  message: string,
  { onChunk, onDone, onError, onToolUse }: StreamCallbacks,
) {
  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
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

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Split on double newline (SSE event boundary)
      const parts = buffer.split('\n\n')
      buffer = parts.pop() ?? '' // keep incomplete last part

      for (const part of parts) {
        const line = part.trim()
        if (!line.startsWith('data: ')) continue
        const json = line.slice(6)
        try {
          const event = JSON.parse(json)
          if (event.type === 'delta' && event.text) {
            onChunk(event.text)
          } else if (event.type === 'tool_use' && event.label) {
            onToolUse?.(event.label)
          } else if (event.type === 'done') {
            onDone()
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

    onDone()
  } catch (err) {
    onError(err instanceof Error ? err.message : 'Network error')
  }
}
