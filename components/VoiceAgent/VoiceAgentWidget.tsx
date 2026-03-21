'use client'

import { AgentCard } from './AgentCard'

export function VoiceAgentWidget() {
  return (
    <div className="fixed top-4 right-4 z-[9999]">
      <AgentCard />
    </div>
  )
}
