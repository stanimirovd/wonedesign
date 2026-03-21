'use client'

import { useAgentStore } from '@/store/agentStore'
import { CandidateCard } from './CandidateCard'

export function CandidateList() {
  const candidateProfiles = useAgentStore((s) => s.candidateProfiles)

  if (!candidateProfiles || candidateProfiles.length === 0) return null

  return (
    <div className="border-t border-white/10 pt-3 flex flex-col gap-2">
      <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium">
        {candidateProfiles.length === 1
          ? '1 profile'
          : `${candidateProfiles.length} profiles`}
      </p>
      <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-0.5">
        {candidateProfiles.map((profile) => (
          <CandidateCard key={profile.id} profile={profile} />
        ))}
      </div>
    </div>
  )
}
