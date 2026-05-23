import { useEffect, useMemo, useRef, useState } from 'react'

const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8001'
const DEFAULT_VIDEO_SRC = 'http://127.0.0.1:8001/smart-traffic/sample-video.mp4'

type MonitoringStatus = 'stopped' | 'starting' | 'running' | 'reconnecting' | 'error'

type MonitoringResponse = {
  status: MonitoringStatus
  stream_url?: string | null
  error?: string | null
}

type LiveTrafficPlayerProps = {
  apiBaseUrl?: string
  videoSrc?: string
}

export function LiveTrafficPlayer({
  apiBaseUrl = DEFAULT_API_BASE_URL,
  videoSrc = DEFAULT_VIDEO_SRC,
}: LiveTrafficPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [monitoringStatus, setMonitoringStatus] = useState<MonitoringStatus>('stopped')
  const [error, setError] = useState<string | null>(null)
  const [streamToken, setStreamToken] = useState(0)

  const isMonitoringEnabled =
    monitoringStatus === 'starting' ||
    monitoringStatus === 'running' ||
    monitoringStatus === 'reconnecting'

  const processedStreamUrl = useMemo(() => {
    return `${apiBaseUrl}/smart-traffic/video/processed.mjpg?token=${streamToken}`
  }, [apiBaseUrl, streamToken])

  const sourceUrl = useMemo(() => {
    return `${videoSrc}${videoSrc.includes('?') ? '&' : '?'}token=${streamToken}`
  }, [streamToken, videoSrc])

  useEffect(() => {
    return () => {
      void fetch(`${apiBaseUrl}/smart-traffic/monitoring/stop`, {
        method: 'POST',
        keepalive: true,
      }).catch(() => undefined)
    }
  }, [apiBaseUrl])

  useEffect(() => {
    const video = videoRef.current

    if (!video) {
      return undefined
    }

    video.src = sourceUrl
    video.load()

    const handleError = () => {
      setError('Локальное видео временно недоступно')
    }

    video.addEventListener('error', handleError)

    return () => {
      video.removeEventListener('error', handleError)
    }
  }, [sourceUrl])

  async function toggleMonitoring() {
    setError(null)

    const endpoint = isMonitoringEnabled
      ? `${apiBaseUrl}/smart-traffic/monitoring/stop`
      : `${apiBaseUrl}/smart-traffic/monitoring/start?stream_url=${encodeURIComponent(videoSrc)}`

    try {
      const response = await fetch(endpoint, { method: 'POST' })

      if (!response.ok) {
        throw new Error('Backend вернул ошибку')
      }

      const payload = (await response.json()) as MonitoringResponse
      setMonitoringStatus(payload.status)

      if (!isMonitoringEnabled) {
        setStreamToken((current) => current + 1)
      }

      if (payload.error) {
        setError(payload.error)
      }
    } catch (requestError) {
      setMonitoringStatus('error')
      setError(requestError instanceof Error ? requestError.message : 'Не удалось переключить мониторинг')
    }
  }

  return (
    <section className="flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div>
          <h2 className="text-base font-semibold">LiveTrafficPlayer</h2>
          <p className="text-sm text-slate-400">Road traffic video for object recognition.mp4</p>
        </div>

        <div className="flex items-center gap-3">
          <span className={statusClassName(monitoringStatus)}>{statusLabel(monitoringStatus)}</span>
          <button
            className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            disabled={monitoringStatus === 'starting'}
            onClick={toggleMonitoring}
            type="button"
          >
            {isMonitoringEnabled ? 'Выключить мониторинг' : 'Включить мониторинг'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="relative flex flex-1 items-center justify-center bg-slate-900">
        {isMonitoringEnabled ? (
          <img
            alt="Обработанный поток SmartTrafficLite"
            className="h-full max-h-[68vh] w-full object-cover"
            src={processedStreamUrl}
          />
        ) : (
          <video
            ref={videoRef}
            className="h-full max-h-[68vh] w-full object-cover"
            controls
            autoPlay
            muted
            preload="auto"
            playsInline
          />
        )}
      </div>
    </section>
  )
}

function statusLabel(status: MonitoringStatus) {
  switch (status) {
    case 'starting':
      return 'Запуск'
    case 'running':
      return 'Мониторинг'
    case 'reconnecting':
      return 'Переподключение'
    case 'error':
      return 'Ошибка'
    default:
      return 'Остановлен'
  }
}

function statusClassName(status: MonitoringStatus) {
  const base = 'rounded-full px-3 py-1 text-xs font-medium'

  switch (status) {
    case 'running':
      return `${base} bg-emerald-500/15 text-emerald-300`
    case 'starting':
    case 'reconnecting':
      return `${base} bg-amber-500/15 text-amber-300`
    case 'error':
      return `${base} bg-red-500/15 text-red-300`
    default:
      return `${base} bg-slate-800 text-slate-300`
  }
}
