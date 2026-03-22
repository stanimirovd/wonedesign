'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useAgentStore } from '@/store/agentStore'

// How long of silence (ms) before auto-submitting
const SILENCE_TIMEOUT_MS = 2500

const RESET_PHRASES = ['start over', 'scratch that', 'never mind', 'cancel that']

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
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { state, setInterimTranscript, setFinalTranscript, stopListening, setError, restartListening } =
    useAgentStore()

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }, [])

  const resetSilenceTimer = useCallback(() => {
    clearSilenceTimer()
    silenceTimerRef.current = setTimeout(() => {
      // Silence has lasted long enough — stop and submit
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch { /* ignore */ }
      }
    }, SILENCE_TIMEOUT_MS)
  }, [clearSilenceTimer])

  const initRecognition = useCallback((): SpeechRecognitionInstance | null => {
    if (!isSupported) return null

    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition
    const recognition = new SR()
    recognition.continuous = true   // keep mic open; we control when to stop
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
          // Check for "start over" voice command
          const normalized = accumulatedFinal.trim().toLowerCase().replace(/[.,!?]+$/, '')
          if (RESET_PHRASES.includes(normalized)) {
            accumulatedFinal = ''
            setFinalTranscript('')
            setInterimTranscript('')
            restartListening()
            resetSilenceTimer()
            return
          }
          setFinalTranscript(accumulatedFinal)
        } else {
          interim += result[0].transcript
        }
      }
      setInterimTranscript(interim)
      // User is still speaking — reset the silence countdown
      resetSilenceTimer()
    }

    recognition.onend = () => {
      clearSilenceTimer()
      stopListening()
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      clearSilenceTimer()
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
  }, [isSupported, setInterimTranscript, setFinalTranscript, stopListening, setError, resetSilenceTimer, clearSilenceTimer, restartListening])

  const start = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser. Try Chrome.')
      return
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch { /* ignore */ }
    }
    const recognition = initRecognition()
    if (!recognition) return
    recognitionRef.current = recognition
    try {
      recognition.start()
      // Start the silence timer immediately so we don't wait forever
      // if the user says nothing after the wake word
      resetSilenceTimer()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start microphone')
    }
  }, [isSupported, initRecognition, setError, resetSilenceTimer])

  const stop = useCallback(() => {
    clearSilenceTimer()
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch { /* ignore */ }
    }
  }, [clearSilenceTimer])

  useEffect(() => {
    if (state === 'listening') {
      start()
    } else {
      stop()
    }
  }, [state, start, stop])

  useEffect(() => {
    return () => {
      clearSilenceTimer()
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch { /* ignore */ }
      }
    }
  }, [clearSilenceTimer])

  return { isSupported }
}
