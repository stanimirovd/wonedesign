'use client'

import { useAgentStore } from '@/store/agentStore'
import type { AgentState } from '@/types/agent'

const STATE_CONFIG: Record<AgentState, { label: string; className: string }> = {
  idle: {
    label: 'Ready',
    className: 'bg-zinc-700/60 text-zinc-300',
  },
  listening: {
    label: 'Listening',
    className: 'bg-emerald-500/20 text-emerald-300 animate-pulse',
  },
  submitted: {
    label: 'Processing',
    className: 'bg-amber-500/20 text-amber-300',
  },
  thinking: {
    label: 'Thinking',
    className: 'bg-amber-500/20 text-amber-300',
  },
  speaking: {
    label: 'Speaking',
    className: 'bg-sky-500/20 text-sky-300',
  },
  error: {
    label: 'Error',
    className: 'bg-red-500/20 text-red-300',
  },
}

export function StatusIndicator() {
  const state = useAgentStore((s) => s.state)
  const { label, className } = STATE_CONFIG[state]

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          state === 'listening'
            ? 'bg-emerald-400'
            : state === 'thinking' || state === 'submitted'
              ? 'bg-amber-400'
              : state === 'speaking'
                ? 'bg-sky-400'
                : state === 'error'
                  ? 'bg-red-400'
                  : 'bg-zinc-500'
        }`}
      />
      {label}
    </span>
  )
}
