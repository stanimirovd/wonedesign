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

  setInterimTranscript: (text) => set({ interimTranscript: text }),

  setFinalTranscript: (text) => set({ finalTranscript: text }),

  unlockMic: () => set({ micUnlocked: true }),

  startListening: () =>
    set({
      state: 'listening',
      interimTranscript: '',
      finalTranscript: '',
      streamedResponse: '',
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
    const { finalTranscript } = get()
    if (!finalTranscript.trim()) return

    set({ state: 'thinking', streamedResponse: '', toolStatus: null })

    fetchClaudeStream(finalTranscript, {
      onChunk: (chunk) => get().appendToResponse(chunk),
      onDone: () => get().setFinishedStreaming(),
      onError: (msg) => get().setError(msg),
      onToolUse: (label) => get().setToolStatus(label),
    })
  },

  appendToResponse: (chunk) =>
    set((s) => ({ streamedResponse: s.streamedResponse + chunk, toolStatus: null })),

  setToolStatus: (label) => set({ toolStatus: label }),

  setFinishedStreaming: () => set({ state: 'speaking', toolStatus: null }),

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
    }),
}))
