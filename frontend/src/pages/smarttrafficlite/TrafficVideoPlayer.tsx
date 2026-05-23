type TrafficVideoPlayerProps = {
  videoSrc?: string
  isLive?: boolean
}

export function TrafficVideoPlayer({ videoSrc, isLive = true }: TrafficVideoPlayerProps) {
  return (
    <section className="flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950 text-white">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <h2 className="text-base font-semibold">SmartTrafficLite</h2>
          <p className="text-sm text-slate-400">Видеоаналитика городского потока</p>
        </div>

        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">
          {isLive ? 'LIVE' : 'VIDEO'}
        </span>
      </div>

      <div className="relative flex flex-1 items-center justify-center bg-slate-900">
        {videoSrc ? (
          <video
            className="h-full max-h-[68vh] w-full object-cover"
            controls
            muted
            playsInline
            src={videoSrc}
          />
        ) : (
          <div className="relative grid h-full min-h-[360px] w-full place-items-center overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(0deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:44px_44px]" />
            <div className="absolute left-1/2 top-0 h-full w-24 -translate-x-1/2 bg-slate-800" />
            <div className="absolute left-0 top-1/2 h-24 w-full -translate-y-1/2 bg-slate-800" />
            <div className="absolute left-1/2 top-0 h-full border-l-2 border-dashed border-amber-300/70" />
            <div className="absolute left-0 top-1/2 w-full border-t-2 border-dashed border-amber-300/70" />

            <div className="z-10 rounded-md border border-slate-700 bg-slate-950/90 px-5 py-4 text-center shadow-xl">
              <p className="text-sm font-medium text-slate-100">Имитация видеопотока</p>
              <p className="mt-1 text-xs text-slate-400">Передайте `videoSrc`, чтобы использовать тег video</p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
