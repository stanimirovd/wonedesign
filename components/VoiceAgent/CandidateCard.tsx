'use client'

import { useState } from 'react'
import type { CandidateProfile } from '@/types/agent'

interface Props {
  profile: CandidateProfile
}

export function CandidateCard({ profile }: Props) {
  const [expanded, setExpanded] = useState(false)

  const visibleSkills = expanded ? profile.skills : profile.skills.slice(0, 6)
  const hiddenCount = profile.skills.length - 6

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex flex-col gap-2">
      {/* Name + role */}
      <div>
        <p className="text-sm font-semibold text-white/90 leading-tight">{profile.name}</p>
        <p className="text-xs text-white/50 mt-0.5">{profile.role}</p>
      </div>

      {/* Location + company */}
      <div className="flex flex-wrap gap-1.5 text-[10px]">
        <span className="px-2 py-0.5 rounded-full bg-white/8 text-white/50 border border-white/10">
          {profile.location}
        </span>
        {profile.currentCompany && (
          <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300/80 border border-indigo-400/20">
            {profile.currentCompany}
          </span>
        )}
      </div>

      {/* Skills */}
      {visibleSkills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {visibleSkills.map((skill) => (
            <span
              key={skill}
              className="px-1.5 py-0.5 rounded-md bg-white/6 text-white/60 text-[10px] border border-white/8"
            >
              {skill}
            </span>
          ))}
          {!expanded && hiddenCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-md text-white/30 text-[10px]">
              +{hiddenCount}
            </span>
          )}
        </div>
      )}

      {/* Summary */}
      <p className={`text-[11px] text-white/40 leading-relaxed${expanded ? '' : ' line-clamp-2'}`}>
        {profile.summary}
      </p>

      {/* Experience (expanded only) */}
      {expanded && profile.experience && profile.experience.length > 0 && (
        <div className="flex flex-col gap-2 pt-1 border-t border-white/8">
          <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium">Experience</p>
          {profile.experience.map((exp, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <p className="text-[11px] text-white/60 font-medium">
                {exp.title} · {exp.company}
              </p>
              <p className="text-[10px] text-white/30">
                {exp.start} – {exp.end ?? 'Present'}
              </p>
              {exp.description && (
                <p className="text-[10px] text-white/35 leading-relaxed">{exp.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {profile.education && profile.education.length > 0 && (
        <p className="text-[10px] text-white/30">
          {profile.education[0].degree} · {profile.education[0].institution}
        </p>
      )}

      {/* Languages */}
      {profile.languages && profile.languages.length > 0 && (
        <p className="text-[10px] text-white/30">{profile.languages.join(' · ')}</p>
      )}

      {/* Expand / collapse toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="self-start text-[10px] text-white/30 hover:text-white/50 transition-colors"
      >
        {expanded ? 'Show less ↑' : 'Show more ↓'}
      </button>

      {/* Profile ID */}
      <p className="text-[9px] text-white/20 font-mono">{profile.id}</p>
    </div>
  )
}
