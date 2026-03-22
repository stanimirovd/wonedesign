'use client'

import { useAgentStore } from '@/store/agentStore'

interface RecordButtonProps {
  onStart: () => void
  onStop: () => void
}

export function RecordButton({ onStart, onStop }: RecordButtonProps) {
  const state = useAgentStore((s) => s.state)
  const unlockMic = useAgentStore((s) => s.unlockMic)
  const interruptSpeaking = useAgentStore((s) => s.interruptSpeaking)
  const isListening = state === 'listening'
  const isSpeaking = state === 'speaking'
  const isDisabled = state === 'submitted' || state === 'thinking'

  const handleClick = () => {
    if (isDisabled) return
    unlockMic()
    if (isSpeaking) {
      interruptSpeaking()
    } else if (isListening) {
      onStop()
    } else {
      onStart()
    }
  }

  return (
    <div className="relative flex items-center justify-center">
      {/* Pulse rings when listening */}
      {isListening && (
        <>
          <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
          <span className="absolute inset-[-6px] rounded-full bg-red-500/20 animate-ping [animation-delay:0.3s]" />
        </>
      )}

      {/* Pulse ring when speaking */}
      {isSpeaking && (
        <span className="absolute inset-[-4px] rounded-full bg-amber-500/25 animate-ping [animation-delay:0.15s]" />
      )}

      <button
        onClick={handleClick}
        disabled={isDisabled}
        aria-label={isSpeaking ? 'Stop speaking' : isListening ? 'Stop recording' : 'Start recording'}
        className={`
          relative z-10 w-12 h-12 rounded-full flex items-center justify-center
          transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50
          ${
            isListening
              ? 'bg-red-500 hover:bg-red-400 shadow-lg shadow-red-500/40 scale-110'
              : isSpeaking
                ? 'bg-amber-500 hover:bg-amber-400 shadow-lg shadow-amber-500/40 scale-105'
                : isDisabled
                  ? 'bg-zinc-700 cursor-not-allowed opacity-50'
                  : 'bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40'
          }
        `}
      >
        {isListening ? (
          // Stop icon
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : isSpeaking ? (
          // Speaker icon with stop indicator
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            <path d="M18 12c0-2.21-1.34-4.11-3.27-4.93v1.96c1.21.68 2.03 1.97 2.03 2.97s-.82 2.29-2.03 2.97v1.96C16.66 16.11 18 14.21 18 12z" opacity="0.4"/>
          </svg>
        ) : (
          // Mic icon
          <svg className="w-5 h-5 text-white/80" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v6a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2z" />
            <path d="M19 10a1 1 0 0 1 1 1 8 8 0 0 1-7 7.938V21h2a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2h2v-2.062A8 8 0 0 1 4 11a1 1 0 1 1 2 0 6 6 0 0 0 12 0 1 1 0 0 1 1-1z" />
          </svg>
        )}
      </button>
    </div>
  )
}
