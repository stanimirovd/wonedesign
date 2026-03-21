'use client'

import { useEffect, useRef } from 'react'
import { useAgentStore } from '@/store/agentStore'

// ─── Wake phrase matching ────────────────────────────────────────────────────
//
// "Wone" is not a real word so the speech recogniser will mishear it in many
// different ways depending on the speaker and ambient conditions.  We use two
// complementary strategies:
//
//  1. Exact-ish phrase list  – covers the most common full transcriptions.
//  2. Word-level proximity   – if any token that *sounds like* "wone" appears
//     within 4 words of "hey", trigger.  This catches phrasing the exact list
//     would miss.

const WAKE_PHRASES = [
  // Direct transcriptions of "hey wone"
  'hey wone', 'hey won', 'hey one', 'hey bone', 'hey hone',
  'hey tone', 'hey lone', 'hey cone', 'hey known', 'hey own',
  'hey home', 'hey phone', 'hey zone', 'hey stone', 'hey throne',
  // Without the 'hey' (sometimes clipped)
  'ok wone', 'okay wone', 'ok one', 'okay one',
  // Alternative openers
  'a wone', 'a one', 'ey wone', 'aye wone',
  // Compound / fast speech
  'heywon', 'heywan', 'heyone',
]

// Words that sound like "wone" and plausibly follow "hey"
const WONE_SOUNDS_LIKE = [
  'wone', 'won', 'one', 'bone', 'hone', 'tone', 'lone', 'cone',
  'known', 'own', 'home', 'phone', 'zone', 'stone', 'throne',
  'wan', 'waan', 'wun', 'whon', 'yone',
]

function matchesWakePhrase(transcript: string): boolean {
  const t = transcript.toLowerCase().trim()

  // Strategy 1: phrase list
  if (WAKE_PHRASES.some((p) => t.includes(p))) return true

  // Strategy 2: "hey" within 4 tokens of a wone-sound-alike
  const words = t.split(/\s+/)
  const heyIdx = words.findIndex((w) => w === 'hey' || w === 'ok' || w === 'okay' || w === 'ey' || w === 'a')
  if (heyIdx !== -1) {
    const window = words.slice(heyIdx + 1, heyIdx + 5)
    if (window.some((w) => WONE_SOUNDS_LIKE.includes(w))) return true
  }

  return false
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Runs a continuous background speech recognition session.
 * Activates the agent when the wake phrase "Hey Wone" (or any likely
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
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
      // Request multiple alternatives so we have a better chance of catching
      // a correct transcription among them
      rec.maxAlternatives = 5
      recognitionRef.current = rec

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          // Check all alternatives, not just the top one
          for (let j = 0; j < result.length; j++) {
            if (matchesWakePhrase(result[j].transcript)) {
              activeRef.current = false
              try { rec.abort() } catch { /* ignore */ }
              recognitionRef.current = null
              startListening()
              return
            }
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
