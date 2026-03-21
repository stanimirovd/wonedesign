'use client'

import { useAgentStore } from '@/store/agentStore'

function AnimatedDots() {
  return (
    <span className="inline-flex gap-1 items-center">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-amber-400/70 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  )
}

export function ResponseDisplay() {
  const state = useAgentStore((s) => s.state)
  const streamedResponse = useAgentStore((s) => s.streamedResponse)
  const errorMessage = useAgentStore((s) => s.errorMessage)
  const toolStatus = useAgentStore((s) => s.toolStatus)

  if (state === 'error' && errorMessage) {
    return (
      <div className="w-full text-sm text-red-300/90 leading-relaxed">
        {errorMessage}
      </div>
    )
  }

  if (toolStatus) {
    return (
      <div className="w-full flex items-center gap-2 text-sm text-white/40">
        <AnimatedDots />
        <span className="text-xs italic">{toolStatus}</span>
      </div>
    )
  }

  if (state === 'thinking' && !streamedResponse) {
    return (
      <div className="w-full flex items-center gap-2 text-sm text-white/40">
        <AnimatedDots />
        <span className="text-xs">Claude is thinking…</span>
      </div>
    )
  }

  if (!streamedResponse) return null

  return (
    <div className="w-full">
      <p className="text-sm text-white/85 leading-relaxed whitespace-pre-wrap">
        {streamedResponse}
        {state === 'thinking' && (
          <span className="inline-block w-0.5 h-3.5 bg-white/60 ml-0.5 animate-pulse align-middle" />
        )}
      </p>
    </div>
  )
}
