'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useAgentStore } from '@/store/agentStore'

// Extend window type for browser speech recognition
type SpeechRecognitionType = {
  new(): SpeechRecognitionInstance
}

type SpeechRecognitionInstance = {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
}

type SpeechRecognitionEvent = {
  resultIndex: number
  results: SpeechRecognitionResultList
}

type SpeechRecognitionResultList = {
  length: number
  [index: number]: SpeechRecognitionResult
}

type SpeechRecognitionResult = {
  isFinal: boolean
  length: number
  [index: number]: SpeechRecognitionAlternative
}

type SpeechRecognitionAlternative = {
  transcript: string
  confidence: number
}

type SpeechRecognitionErrorEvent = {
  error: string
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionType
    webkitSpeechRecognition: SpeechRecognitionType
  }
}

export function useSpeechRecognition() {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const { state, setInterimTranscript, setFinalTranscript, stopListening, setError } =
    useAgentStore()

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const initRecognition = useCallback((): SpeechRecognitionInstance | null => {
    if (!isSupported) return null

    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition
    const recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    let accumulatedFinal = ''

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          accumulatedFinal += result[0].transcript
          setFinalTranscript(accumulatedFinal)
        } else {
          interim += result[0].transcript
        }
      }
      setInterimTranscript(interim)
    }

    recognition.onend = () => {
      // Auto-submit when speech recognition ends (silence detected)
      stopListening()
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech') {
        stopListening()
        return
      }
      if (event.error === 'not-allowed' || event.error === 'denied') {
        setError('Microphone access denied. Please allow microphone access.')
        return
      }
      setError(`Speech recognition error: ${event.error}`)
    }

    return recognition
  }, [isSupported, setInterimTranscript, setFinalTranscript, stopListening, setError])

  const start = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser. Try Chrome.')
      return
    }
    // Stop any existing session
    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch { /* ignore */ }
    }
    const recognition = initRecognition()
    if (!recognition) return
    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start microphone')
    }
  }, [isSupported, initRecognition, setError])

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch { /* ignore */ }
    }
  }, [])

  // Start/stop in sync with store state
  useEffect(() => {
    if (state === 'listening') {
      start()
    } else {
      stop()
    }
  }, [state, start, stop])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch { /* ignore */ }
      }
    }
  }, [])

  return { isSupported }
}
