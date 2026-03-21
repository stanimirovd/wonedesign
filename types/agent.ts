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

  // Actions
  setInterimTranscript: (text: string) => void
  setFinalTranscript: (text: string) => void
  startListening: () => void
  stopListening: () => void
  submitTranscript: () => void
  appendToResponse: (chunk: string) => void
  setFinishedStreaming: () => void
  setFinishedSpeaking: () => void
  setError: (msg: string) => void
  reset: () => void
}
