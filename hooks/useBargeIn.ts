'use client'

import { useEffect, useRef } from 'react'
import { useAgentStore } from '@/store/agentStore'

interface BargeInRecognition {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  abort: () => void
  onresult: ((e: BargeInEvent) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

interface BargeInEvent {
  results: { [i: number]: { isFinal: boolean; [j: number]: { confidence: number } } }
  resultIndex: number
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

    // Delay start to avoid catching acoustic echo from the first moment of TTS
    const timer = setTimeout(() => {
      const recognition = new SR()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = (e: BargeInEvent) => {
        const result = e.results[e.resultIndex]
        // Ignore low-confidence or non-final results (likely TTS echo)
        if (!result.isFinal || result[0].confidence < 0.5) return
        try { recognition.abort() } catch { /* ignore */ }
        recognitionRef.current = null
        startListening()
      }

      recognition.onerror = () => {
        // Don't null the ref — onend will fire next and handle restart
      }

      recognition.onend = () => {
        // If onresult already triggered barge-in, ref was nulled → don't restart
        if (recognitionRef.current === recognition) {
          try { recognition.start() } catch { recognitionRef.current = null }
        }
      }

      recognitionRef.current = recognition
      try { recognition.start() } catch { /* ignore */ }
    }, 1000)

    return () => {
      clearTimeout(timer)
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch { /* ignore */ }
        recognitionRef.current = null
      }
    }
  }, [state, startListening])
}
