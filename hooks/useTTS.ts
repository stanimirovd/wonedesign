'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useAgentStore } from '@/store/agentStore'

export function useTTS() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { state, streamedResponse, setFinishedSpeaking } = useAgentStore()

  const cancel = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    // Also cancel any in-flight Web Speech fallback
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }, [])

  const speakWithElevenLabs = useCallback(
    async (text: string) => {
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })

        if (!res.ok) {
          // ElevenLabs not configured or errored — fall through to Web Speech
          throw new Error('elevenlabs_unavailable')
        }

        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audioRef.current = audio

        audio.onended = () => {
          URL.revokeObjectURL(url)
          audioRef.current = null
          setFinishedSpeaking()
        }
        audio.onerror = () => {
          URL.revokeObjectURL(url)
          audioRef.current = null
          setFinishedSpeaking()
        }

        await audio.play()
      } catch {
        // Fallback: Web Speech API
        speakWithWebSpeech(text)
      }
    },
    [setFinishedSpeaking], // speakWithWebSpeech defined below
  )

  // Web Speech fallback (inline so it captures setFinishedSpeaking)
  const speakWithWebSpeech = useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        setFinishedSpeaking()
        return
      }
      window.speechSynthesis.cancel()
      const sentences = text.match(/[^.!?]+[.!?]*/g) ?? [text]
      const queue = sentences.map((s) => {
        const u = new SpeechSynthesisUtterance(s.trim())
        u.rate = 1.0
        u.pitch = 1.0
        u.volume = 1.0
        return u
      })

      const playNext = () => {
        const u = queue.shift()
        if (!u) { setFinishedSpeaking(); return }
        u.onend = playNext
        u.onerror = playNext
        window.speechSynthesis.speak(u)
      }
      playNext()
    },
    [setFinishedSpeaking],
  )

  const speak = useCallback(
    (text: string) => {
      if (!text.trim()) { setFinishedSpeaking(); return }
      cancel()
      speakWithElevenLabs(text)
    },
    [cancel, speakWithElevenLabs, setFinishedSpeaking],
  )

  useEffect(() => {
    if (state === 'speaking' && streamedResponse) {
      speak(streamedResponse)
    }
    if (state === 'idle' || state === 'listening') {
      cancel()
    }
  }, [state, streamedResponse, speak, cancel])

  useEffect(() => {
    return () => { cancel() }
  }, [cancel])

  return {}
}
