'use client'

import { useEffect, useRef } from 'react'
import { useAgentStore } from '@/store/agentStore'

// "Wone" is not a real word so speech recognition will mishear it.
// Match any plausible transcription of "Hey Wone".
const WAKE_PATTERNS = [
  'hey wone',
  'hey one',
  'hey won',
  'hey bone',
  'hey hone',
  'hey home',
  'hey own',
  'hey lone',
  'a wone',
  'a one',
]

function matchesWakePhrase(transcript: string): boolean {
  const t = transcript.toLowerCase().trim()
  return WAKE_PATTERNS.some((p) => t.includes(p))
}

/**
 * Runs a continuous background speech recognition session.
 * Activates the agent when the wake phrase "Hey Wone" (or a likely
 * mishearing) is detected.
 *
 * Only starts after the user has clicked the mic button at least once,
 * because Chrome requires a prior user gesture before allowing background
 * microphone access.
 */
export function useWakeWord() {
  const state = useAgentStore((s) => s.state)
  const micUnlocked = useAgentStore((s) => s.micUnlocked)
  const startListening = useAgentStore((s) => s.startListening)

  const recognitionRef = useRef<{
    continuous: boolean
    interimResults: boolean
    lang: string
    start: () => void
    stop: () => void
    abort: () => void
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onresult: ((e: any) => void) | null
    onend: (() => void) | null
    onerror: ((e: { error: string }) => void) | null
  } | null>(null)

  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeRef = useRef(false)

  useEffect(() => {
    const isSupported =
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

    // Only run when idle and the user has granted mic access via a click
    if (!isSupported || state !== 'idle' || !micUnlocked) {
      activeRef.current = false
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current)
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch { /* ignore */ }
        recognitionRef.current = null
      }
      return
    }

    function startWakeListener() {
      if (!activeRef.current) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
      if (!SR) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rec = new SR() as any
      rec.continuous = true
      rec.interimResults = true
      rec.lang = 'en-US'
      recognitionRef.current = rec

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript: string = event.results[i][0].transcript
          if (matchesWakePhrase(transcript)) {
            activeRef.current = false
            try { rec.abort() } catch { /* ignore */ }
            recognitionRef.current = null
            startListening()
            return
          }
        }
      }

      rec.onend = () => {
        if (activeRef.current) {
          restartTimerRef.current = setTimeout(startWakeListener, 300)
        }
      }

      rec.onerror = (e: { error: string }) => {
        if (e.error === 'not-allowed' || e.error === 'denied') {
          activeRef.current = false
          return
        }
        if (activeRef.current) {
          restartTimerRef.current = setTimeout(startWakeListener, 1000)
        }
      }

      try { rec.start() } catch { /* ignore */ }
    }

    activeRef.current = true
    startWakeListener()

    return () => {
      activeRef.current = false
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current)
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch { /* ignore */ }
        recognitionRef.current = null
      }
    }
  }, [state, micUnlocked, startListening])
}
