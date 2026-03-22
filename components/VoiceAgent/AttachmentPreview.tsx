'use client'

import { useAgentStore } from '@/store/agentStore'

export function AttachmentPreview() {
  const attachment = useAgentStore((s) => s.attachment)
  const setAttachment = useAgentStore((s) => s.setAttachment)

  if (!attachment) return null

  const isImage = attachment.mediaType !== 'application/pdf'

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-white/5 border border-white/10 rounded-xl">
      {isImage && attachment.previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={attachment.previewUrl}
          alt={attachment.name}
          className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
      )}
      <span className="text-xs text-white/60 truncate flex-1 min-w-0">{attachment.name}</span>
      <button
        onClick={() => setAttachment(null)}
        aria-label="Remove attachment"
        className="w-5 h-5 rounded-full flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors flex-shrink-0"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
