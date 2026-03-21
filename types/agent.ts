export type AgentState =
  | 'idle'
  | 'listening'
  | 'submitted'
  | 'thinking'
  | 'speaking'
  | 'error'

export interface CandidateProfile {
  id: string
  name: string
  role: string
  location: string
  skills: string[]
  summary: string
  currentCompany: string | null
  totalExperiences: number
  // Optional fields populated for single-profile lookups
  education?: { institution: string; degree: string; year: number }[]
  languages?: string[]
}

export interface AgentStore {
  state: AgentState
  interimTranscript: string
  finalTranscript: string
  streamedResponse: string
  errorMessage: string | null
  micUnlocked: boolean
  toolStatus: string | null
  candidateProfiles: CandidateProfile[] | null

  // Actions
  setInterimTranscript: (text: string) => void
  setFinalTranscript: (text: string) => void
  unlockMic: () => void
  startListening: () => void
  stopListening: () => void
  submitTranscript: () => void
  appendToResponse: (chunk: string) => void
  setToolStatus: (label: string | null) => void
  setCandidates: (profiles: CandidateProfile[]) => void
  setFinishedStreaming: () => void
  setFinishedSpeaking: () => void
  setError: (msg: string) => void
  reset: () => void
}
