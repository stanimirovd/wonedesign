export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-8 text-center">
      <div className="max-w-lg space-y-6">
        <h1 className="text-4xl font-bold tracking-tight text-white/90">
          Wone
        </h1>
        <p className="text-lg text-white/40 leading-relaxed">
          Say <span className="text-white/60 font-medium">&ldquo;Hey Wone&rdquo;</span> or click the mic button in the top-right corner to start a conversation.
          Speak your request — Wone will transcribe and respond in real time.
        </p>
        <div className="flex flex-col items-center gap-2 text-sm text-white/25">
          <p>
            <kbd className="px-2 py-1 rounded bg-white/10 font-mono text-xs">Ctrl</kbd>
            {' + '}
            <kbd className="px-2 py-1 rounded bg-white/10 font-mono text-xs">Shift</kbd>
            {' + '}
            <kbd className="px-2 py-1 rounded bg-white/10 font-mono text-xs">M</kbd>
            {' — toggle mic'}
          </p>
          <p>
            <kbd className="px-2 py-1 rounded bg-white/10 font-mono text-xs">Esc</kbd>
            {' — reset / close'}
          </p>
        </div>
      </div>
    </main>
  )
}
