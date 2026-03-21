'use client'

import { useEffect } from 'react'
import { useAgentStore } from '@/store/agentStore'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useTTS } from '@/hooks/useTTS'
import { RecordButton } from './RecordButton'
import { StatusIndicator } from './StatusIndicator'
import { TranscriptDisplay } from './TranscriptDisplay'
import { ResponseDisplay } from './ResponseDisplay'

export function AgentCard() {
  const state = useAgentStore((s) => s.state)
  const finalTranscript = useAgentStore((s) => s.finalTranscript)
  const streamedResponse = useAgentStore((s) => s.streamedResponse)
  const { startListening, stopListening, reset } = useAgentStore()
  const { isSupported } = useSpeechRecognition()
  useTTS()

  // Ctrl+Shift+M global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        e.preventDefault()
        if (state === 'listening') {
          stopListening()
        } else if (state === 'idle' || state === 'error') {
          startListening()
        }
      }
      if (e.key === 'Escape') {
        reset()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state, startListening, stopListening, reset])

  const isActive =
    state === 'listening' ||
    state === 'submitted' ||
    state === 'thinking' ||
    state === 'speaking' ||
    state === 'error'

  const showTranscript = isActive || finalTranscript !== ''
  const showResponse =
    state === 'thinking' ||
    state === 'speaking' ||
    state === 'error' ||
    streamedResponse !== ''

  const showContent = showTranscript || showResponse

  return (
    <div
      className={`
        flex flex-col gap-3
        bg-black/60 backdrop-blur-xl
        border border-white/10
        rounded-2xl shadow-2xl
        transition-all duration-300 ease-in-out
        overflow-hidden
        ${showContent ? 'w-72 p-4' : 'w-auto p-2'}
      `}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <RecordButton onStart={startListening} onStop={stopListening} />
          {showContent && (
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-xs font-semibold text-white/70 tracking-wide">
                Voice Agent
              </span>
              <StatusIndicator />
            </div>
          )}
        </div>

        {showContent && (
          <button
            onClick={reset}
            aria-label="Close"
            className="w-6 h-6 rounded-full flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Transcript */}
      {showTranscript && (
        <div className="border-t border-white/10 pt-3">
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5 font-medium">
            You said
          </p>
          <TranscriptDisplay />
        </div>
      )}

      {/* Response */}
      {showResponse && (
        <div className="border-t border-white/10 pt-3">
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5 font-medium">
            Claude
          </p>
          <ResponseDisplay />
        </div>
      )}

      {/* Browser support warning */}
      {!isSupported && (
        <p className="text-xs text-amber-400/80 text-center">
          Use Chrome for voice support
        </p>
      )}

      {/* Keyboard hint (collapsed state) */}
      {!showContent && (
        <p className="text-[9px] text-white/20 text-center whitespace-nowrap px-1">
          Ctrl+Shift+M
        </p>
      )}
    </div>
  )
}
