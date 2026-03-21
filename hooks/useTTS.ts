'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useAgentStore } from '@/store/agentStore'

export function useTTS() {
  const utteranceQueueRef = useRef<SpeechSynthesisUtterance[]>([])
  const isSpeakingRef = useRef(false)
  const { state, streamedResponse, setFinishedSpeaking } = useAgentStore()

  const isSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window

  const cancel = useCallback(() => {
    if (!isSupported) return
    window.speechSynthesis.cancel()
    utteranceQueueRef.current = []
    isSpeakingRef.current = false
  }, [isSupported])

  const speakNext = useCallback(() => {
    if (!isSupported) return
    const queue = utteranceQueueRef.current
    if (queue.length === 0) {
      isSpeakingRef.current = false
      setFinishedSpeaking()
      return
    }
    const utterance = queue.shift()!
    isSpeakingRef.current = true
    utterance.onend = () => speakNext()
    utterance.onerror = () => speakNext()
    window.speechSynthesis.speak(utterance)
  }, [isSupported, setFinishedSpeaking])

  const speak = useCallback(
    (text: string) => {
      if (!isSupported || !text.trim()) {
        setFinishedSpeaking()
        return
      }

      cancel()

      // Split into sentences to avoid Chrome's buffer limit
      const sentences = text.match(/[^.!?]+[.!?]*/g) ?? [text]
      utteranceQueueRef.current = sentences
        .map((s) => s.trim())
        .filter(Boolean)
        .map((sentence) => {
          const u = new SpeechSynthesisUtterance(sentence)
          u.rate = 1.0
          u.pitch = 1.0
          u.volume = 1.0
          return u
        })

      speakNext()
    },
    [isSupported, cancel, speakNext, setFinishedSpeaking],
  )

  // Trigger TTS when state transitions to 'speaking'
  useEffect(() => {
    if (state === 'speaking' && streamedResponse) {
      speak(streamedResponse)
    }
    if (state === 'idle' || state === 'listening') {
      cancel()
    }
  }, [state, streamedResponse, speak, cancel])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancel()
    }
  }, [cancel])

  return { isSupported }
}
