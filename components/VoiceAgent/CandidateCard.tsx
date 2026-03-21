'use client'

import type { CandidateProfile } from '@/types/agent'

interface Props {
  profile: CandidateProfile
}

export function CandidateCard({ profile }: Props) {
  const visibleSkills = profile.skills.slice(0, 6)

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
          {profile.skills.length > 6 && (
            <span className="px-1.5 py-0.5 rounded-md text-white/30 text-[10px]">
              +{profile.skills.length - 6}
            </span>
          )}
        </div>
      )}

      {/* Summary */}
      <p className="text-[11px] text-white/40 leading-relaxed line-clamp-2">{profile.summary}</p>

      {/* Education (shown for single-profile lookups) */}
      {profile.education && profile.education.length > 0 && (
        <p className="text-[10px] text-white/30">
          {profile.education[0].degree} · {profile.education[0].institution}
        </p>
      )}

      {/* Languages (shown for single-profile lookups) */}
      {profile.languages && profile.languages.length > 0 && (
        <p className="text-[10px] text-white/30">{profile.languages.join(' · ')}</p>
      )}

      {/* Profile ID */}
      <p className="text-[9px] text-white/20 font-mono">{profile.id}</p>
    </div>
  )
}
