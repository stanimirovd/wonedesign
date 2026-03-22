export interface ConversationTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface AttachedFile {
  name: string
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'application/pdf'
    | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  data: string        // raw base64, no data-URL prefix
  previewUrl: string | null  // object URL for images; null for PDFs
}

export type AgentState =
  | 'idle'
  | 'listening'
  | 'submitted'
  | 'thinking'
  | 'speaking'
  | 'error'

export interface Experience {
  company: string
  title: string
  start: string
  end: string | null
  description: string
}

export interface CandidateProfile {
  id: string
  name: string
  role: string
  location: string
  skills: string[]
  summary: string
  currentCompany: string | null
  totalExperiences: number
  education?: { institution: string; degree: string; year: number }[]
  languages?: string[]
  experience?: Experience[]
}

export interface RoleBrief {
  title: string
  skills: string[]
  location: string | null
  experienceLevel: string | null
  summary: string
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
  conversationHistory: ConversationTurn[]
  attachment: AttachedFile | null

  // Actions
  setInterimTranscript: (text: string) => void
  setFinalTranscript: (text: string) => void
  unlockMic: () => void
  startListening: () => void
  stopListening: () => void
  submitTranscript: () => void
  submitText: (text: string) => void
  setAttachment: (file: AttachedFile | null) => void
  appendToResponse: (chunk: string) => void
  setToolStatus: (label: string | null) => void
  setCandidates: (profiles: CandidateProfile[]) => void
  setFinishedStreaming: (responseText: string) => void
  setFinishedSpeaking: () => void
  interruptSpeaking: () => void
  restartListening: () => void
  setError: (msg: string) => void
  reset: () => void
}
