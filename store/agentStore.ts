import { create } from 'zustand'
import type { AgentStore } from '@/types/agent'
import { fetchClaudeStream } from '@/lib/fetchClaudeStream'

export const useAgentStore = create<AgentStore>((set, get) => ({
  state: 'idle',
  interimTranscript: '',
  finalTranscript: '',
  streamedResponse: '',
  errorMessage: null,
  micUnlocked: false,
  toolStatus: null,
  candidateProfiles: null,
  conversationHistory: [],

  setInterimTranscript: (text) => set({ interimTranscript: text }),

  setFinalTranscript: (text) => set({ finalTranscript: text }),

  unlockMic: () => set({ micUnlocked: true }),

  startListening: () =>
    set({
      state: 'listening',
      interimTranscript: '',
      finalTranscript: '',
      // streamedResponse and candidateProfiles intentionally kept —
      // previous agent response and profile cards stay visible while the user speaks
      errorMessage: null,
      toolStatus: null,
    }),

  stopListening: () => {
    const { finalTranscript } = get()
    if (finalTranscript.trim()) {
      get().submitTranscript()
    } else {
      set({ state: 'idle' })
    }
  },

  submitTranscript: () => {
    const { finalTranscript, conversationHistory } = get()
    if (!finalTranscript.trim()) return

    // Clear the previous text response so the new one streams in fresh.
    // candidateProfiles is intentionally kept until the agent returns new ones.
    set({ state: 'thinking', streamedResponse: '', toolStatus: null })

    fetchClaudeStream(finalTranscript, conversationHistory, {
      onChunk: (chunk) => get().appendToResponse(chunk),
      onDone: (responseText) => get().setFinishedStreaming(responseText),
      onError: (msg) => get().setError(msg),
      onToolUse: (label) => get().setToolStatus(label),
      onCandidates: (profiles) => get().setCandidates(profiles),
    })
  },

  appendToResponse: (chunk) =>
    set((s) => ({ streamedResponse: s.streamedResponse + chunk, toolStatus: null })),

  setToolStatus: (label) => set({ toolStatus: label }),

  setCandidates: (profiles) => set({ candidateProfiles: profiles }),

  setFinishedStreaming: (responseText) =>
    set((s) => {
      // Append current profile IDs to the assistant message so the agent
      // can reference them in follow-ups (e.g. "keep only two").
      let content = responseText
      if (s.candidateProfiles && s.candidateProfiles.length > 0) {
        const ids = s.candidateProfiles
          .map((p) => `${p.id} (${p.name}, ${p.role})`)
          .join('; ')
        content += `\n[Profiles shown in UI: ${ids}]`
      }
      return {
        state: 'speaking',
        toolStatus: null,
        conversationHistory: [
          ...s.conversationHistory,
          { role: 'user' as const, content: s.finalTranscript },
          { role: 'assistant' as const, content },
        ],
      }
    }),

  setFinishedSpeaking: () => set({ state: 'idle' }),

  setError: (msg) => set({ state: 'error', errorMessage: msg, toolStatus: null }),

  reset: () =>
    set({
      state: 'idle',
      interimTranscript: '',
      finalTranscript: '',
      streamedResponse: '',
      errorMessage: null,
      toolStatus: null,
      candidateProfiles: null,
      conversationHistory: [],
    }),
}))
