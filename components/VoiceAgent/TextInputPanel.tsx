'use client'

import { useState, useRef } from 'react'
import { useAgentStore } from '@/store/agentStore'
import type { RoleBrief } from '@/types/agent'

interface TextInputPanelProps {
  onSearchSubmitted: () => void
}

export function TextInputPanel({ onSearchSubmitted }: TextInputPanelProps) {
  const [phase, setPhase] = useState<'input' | 'preview'>('input')
  const [inputText, setInputText] = useState('')
  const [brief, setBrief] = useState<RoleBrief | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const submitText = useAgentStore((s) => s.submitText)

  async function handleParse() {
    if (!inputText.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/parse-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }
      setBrief(data.brief)
      setPhase('preview')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleConfirm() {
    if (!brief) return
    const parts: string[] = [`Find me a ${brief.title}`]
    if (brief.location) parts.push(`based in ${brief.location}`)
    if (brief.skills.length) parts.push(`with skills in ${brief.skills.join(', ')}`)
    if (brief.experienceLevel) parts.push(`at ${brief.experienceLevel} level`)
    const query = parts.join(', ')
    submitText(query)
    onSearchSubmitted()
  }

  function handleEdit() {
    setPhase('input')
    setBrief(null)
    setError(null)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  if (phase === 'preview' && brief) {
    return (
      <div className="flex flex-col gap-3 pt-1">
        {/* Role title */}
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1 font-medium">
            Role
          </p>
          <p className="text-sm font-semibold text-white/90">{brief.title}</p>
        </div>

        {/* Skills */}
        {brief.skills.length > 0 && (
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5 font-medium">
              Skills
            </p>
            <div className="flex flex-wrap gap-1.5">
              {brief.skills.map((skill) => (
                <span
                  key={skill}
                  className="bg-white/10 text-white/70 text-xs rounded-full px-2.5 py-0.5"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Location + Experience */}
        {(brief.location || brief.experienceLevel) && (
          <div className="flex flex-col gap-1">
            {brief.location && (
              <p className="text-xs text-white/50">
                <span className="text-white/30">Location</span>{' '}
                <span className="text-white/70">{brief.location}</span>
              </p>
            )}
            {brief.experienceLevel && (
              <p className="text-xs text-white/50">
                <span className="text-white/30">Level</span>{' '}
                <span className="text-white/70">{brief.experienceLevel}</span>
              </p>
            )}
          </div>
        )}

        {/* Summary */}
        {brief.summary && (
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1 font-medium">
              Brief
            </p>
            <p className="text-xs text-white/60 leading-relaxed">{brief.summary}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleConfirm}
            className="flex-1 bg-white/15 hover:bg-white/25 text-white text-xs font-medium rounded-xl px-3 py-2 transition-colors"
          >
            Search candidates
          </button>
          <button
            onClick={handleEdit}
            className="text-white/40 hover:text-white/60 text-xs transition-colors whitespace-nowrap"
          >
            ← Edit
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5 pt-1">
      <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium">
        Type or paste
      </p>
      <textarea
        ref={textareaRef}
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            handleParse()
          }
        }}
        rows={4}
        placeholder="Start typing or add links"
        className="bg-white/5 border border-white/10 rounded-xl text-sm text-white/80 placeholder:text-white/25 resize-none focus:outline-none focus:border-white/20 p-3 w-full leading-relaxed"
        autoFocus
      />

      {error && (
        <p className="text-xs text-red-400/80">{error}</p>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleParse}
          disabled={loading || !inputText.trim()}
          aria-label="Parse and preview"
          className="w-8 h-8 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
          ) : (
            <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
