'use client'

import { useEffect, useRef } from 'react'
import { useAgentStore } from '@/store/agentStore'

export function TranscriptDisplay() {
  const interimTranscript = useAgentStore((s) => s.interimTranscript)
  const finalTranscript = useAgentStore((s) => s.finalTranscript)
  const state = useAgentStore((s) => s.state)
  const ref = useRef<HTMLDivElement>(null)

  const hasContent = finalTranscript || interimTranscript

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight
    }
  }, [finalTranscript, interimTranscript])

  if (!hasContent && state !== 'listening') return null

  return (
    <div
      ref={ref}
      className="w-full max-h-28 overflow-y-auto text-sm leading-relaxed"
    >
      {hasContent ? (
        <p>
          <span className="text-white/90">{finalTranscript}</span>
          {interimTranscript && (
            <span className="text-white/40 italic"> {interimTranscript}</span>
          )}
        </p>
      ) : (
        <p className="text-white/30 italic text-xs">Listening…</p>
      )}
    </div>
  )
}
