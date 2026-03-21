'use client'

import { useEffect, useRef } from 'react'
import { useAgentStore } from '@/store/agentStore'

const WAKE_PHRASE = 'hey wone'

/**
 * Runs a continuous, low-priority speech recognition session in the background.
 * When the wake phrase "Hey Wone" is detected it calls startListening(), which
 * hands control over to the main useSpeechRecognition hook.
 */
export function useWakeWord() {
  const state = useAgentStore((s) => s.state)
  const startListening = useAgentStore((s) => s.startListening)
  const recognitionRef = useRef<{
    continuous: boolean
    interimResults: boolean
    lang: string
    start: () => void
    stop: () => void
    abort: () => void
    onresult: ((e: { results: { [i: number]: { isFinal: boolean; [j: number]: { transcript: string } } }; resultIndex: number }) => void) | null
    onend: (() => void) | null
    onerror: ((e: { error: string }) => void) | null
  } | null>(null)
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeRef = useRef(false)

  useEffect(() => {
    const isSupported =
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

    if (!isSupported) return

    // Only run wake-word listener when the agent is idle or reset
    const shouldListen = state === 'idle'

    if (!shouldListen) {
      // Stop wake-word listener while agent is busy
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

      const SR =
        (window as typeof window & { SpeechRecognition?: new () => typeof recognitionRef.current; webkitSpeechRecognition?: new () => typeof recognitionRef.current }).SpeechRecognition ??
        (window as typeof window & { webkitSpeechRecognition?: new () => typeof recognitionRef.current }).webkitSpeechRecognition

      if (!SR) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rec = new (SR as any)()
      rec.continuous = true
      rec.interimResults = true
      rec.lang = 'en-US'
      recognitionRef.current = rec

      rec.onresult = (event: { results: { [i: number]: { isFinal: boolean; [j: number]: { transcript: string } } }; resultIndex: number }) => {
        for (let i = event.resultIndex; i < Object.keys(event.results).length; i++) {
          const transcript = event.results[i][0].transcript.toLowerCase().trim()
          if (transcript.includes(WAKE_PHRASE)) {
            // Wake phrase detected — hand off to the main agent
            activeRef.current = false
            try { rec.abort() } catch { /* ignore */ }
            recognitionRef.current = null
            startListening()
            return
          }
        }
      }

      rec.onend = () => {
        // Restart after a short pause so we stay alive
        if (activeRef.current) {
          restartTimerRef.current = setTimeout(startWakeListener, 300)
        }
      }

      rec.onerror = (e: { error: string }) => {
        if (e.error === 'not-allowed' || e.error === 'denied') {
          activeRef.current = false
          return
        }
        // For other errors just restart
        if (activeRef.current) {
          restartTimerRef.current = setTimeout(startWakeListener, 1000)
        }
      }

      try { rec.start() } catch { /* ignore if already started */ }
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
  }, [state, startListening])
}
