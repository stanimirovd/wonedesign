export type AgentState =
  | 'idle'
  | 'listening'
  | 'submitted'
  | 'thinking'
  | 'speaking'
  | 'error'

export interface AgentStore {
  state: AgentState
  interimTranscript: string
  finalTranscript: string
  streamedResponse: string
  errorMessage: string | null
  micUnlocked: boolean
  toolStatus: string | null

  // Actions
  setInterimTranscript: (text: string) => void
  setFinalTranscript: (text: string) => void
  unlockMic: () => void
  startListening: () => void
  stopListening: () => void
  submitTranscript: () => void
  appendToResponse: (chunk: string) => void
  setToolStatus: (label: string | null) => void
  setFinishedStreaming: () => void
  setFinishedSpeaking: () => void
  setError: (msg: string) => void
  reset: () => void
}
