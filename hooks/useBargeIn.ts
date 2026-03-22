'use client'

import { useEffect, useRef } from 'react'
import { useAgentStore } from '@/store/agentStore'

interface BargeInRecognition {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  abort: () => void
  onresult: (() => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

export function useBargeIn() {
  const state = useAgentStore((s) => s.state)
  const startListening = useAgentStore((s) => s.startListening)
  const recognitionRef = useRef<BargeInRecognition | null>(null)

  useEffect(() => {
    if (state !== 'speaking') {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch { /* ignore */ }
        recognitionRef.current = null
      }
      return
    }

    if (typeof window === 'undefined') return
    const SR: (new () => BargeInRecognition) | undefined =
      (window as unknown as { SpeechRecognition?: new () => BargeInRecognition }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => BargeInRecognition }).webkitSpeechRecognition
    if (!SR) return

    const recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = () => {
      // Any speech detected while agent is speaking = barge-in interrupt
      try { recognition.abort() } catch { /* ignore */ }
      recognitionRef.current = null
      startListening()
    }

    recognition.onerror = () => {
      recognitionRef.current = null
    }

    recognition.onend = () => {
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    try { recognition.start() } catch { /* ignore */ }

    return () => {
      try { recognition.abort() } catch { /* ignore */ }
    }
  }, [state, startListening])
}
