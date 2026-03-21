'use client'

import { AgentCard } from './AgentCard'

export function VoiceAgentWidget() {
  return (
    <div className="fixed top-4 right-4 z-[9999] max-h-[calc(100vh-2rem)] flex flex-col">
      <AgentCard />
    </div>
  )
}
