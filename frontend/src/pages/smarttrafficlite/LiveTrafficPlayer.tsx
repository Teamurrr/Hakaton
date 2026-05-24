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
      setError('Не удалось загрузить локальное видео с backend-сервиса.')
    }

    video.addEventListener('error', handleError)

    return () => {
      video.removeEventListener('error', handleError)
    }
  }, [sourceUrl])

  async function toggleMonitoring() {
    setError(null)
    setMonitoringStatus((current) => (current === 'stopped' ? 'starting' : current))

    const endpoint = isMonitoringEnabled
      ? `${apiBaseUrl}/smart-traffic/monitoring/stop`
      : `${apiBaseUrl}/smart-traffic/monitoring/start?stream_url=${encodeURIComponent(videoSrc)}`

    try {
      const response = await fetch(endpoint, { method: 'POST' })

      if (!response.ok) {
        throw new Error('Backend вернул ошибку при переключении режима анализа.')
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
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Не удалось переключить режим анализа трафика.',
      )
    }
  }

  return (
    <section className="flex min-h-[560px] flex-1 flex-col overflow-hidden rounded-[32px] border border-slate-800 bg-slate-950 text-white shadow-2xl shadow-slate-950/40">
      <div className="border-b border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.16),_transparent_32%),linear-gradient(135deg,_#020617,_#111827)] px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.26em] text-cyan-300/80">Видеоаналитика трафика</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Определение плотности потока по видео</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Слева пользователь видит исходное видео или обработанный поток,
              а справа приходит результат модели: количество машин, уровень нагрузки
              и рекомендуемое время зеленого сигнала.
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-3">
            <span className={statusClassName(monitoringStatus)}>{statusLabel(monitoringStatus)}</span>
            <button
              className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              disabled={monitoringStatus === 'starting'}
              onClick={toggleMonitoring}
              type="button"
            >
              {isMonitoringEnabled ? 'Остановить анализ' : 'Запустить анализ'}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 text-sm text-slate-300 md:grid-cols-3">
          <InfoPill
            label="Видео"
            value="Road traffic video for object recognition.mp4"
          />
          <InfoPill
            label="Режим"
            value={isMonitoringEnabled ? 'Обработанный поток с детекцией' : 'Обычное исходное видео'}
          />
          <InfoPill
            label="Что доказывает работу"
            value="При запуске анализа справа обновляются машины, нагрузка и длительность зеленого."
          />
        </div>
      </div>

      {error ? (
        <div className="border-b border-red-500/20 bg-red-500/10 px-6 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="flex flex-1 flex-col bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-3 text-xs uppercase tracking-[0.22em] text-slate-500">
          <span>{isMonitoringEnabled ? 'Поток после анализа модели' : 'Исходное видео'}</span>
          <span>{isMonitoringEnabled ? 'YOLO detection active' : 'Preview mode'}</span>
        </div>

        <div className="relative flex flex-1 items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_40%),_#020617] p-4">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(0deg,rgba(148,163,184,0.05)_1px,transparent_1px)] bg-[size:32px_32px]" />
          <div className="relative w-full overflow-hidden rounded-[28px] border border-slate-800 bg-black shadow-2xl shadow-cyan-950/20">
            {isMonitoringEnabled ? (
              <img
                alt="Обработанный поток SmartTrafficLite"
                className="h-full max-h-[70vh] min-h-[360px] w-full object-cover"
                src={processedStreamUrl}
              />
            ) : (
              <video
                ref={videoRef}
                className="h-full max-h-[70vh] min-h-[360px] w-full object-cover"
                controls
                autoPlay
                muted
                preload="auto"
                playsInline
              />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm leading-5 text-slate-200">{value}</p>
    </div>
  )
}

function statusLabel(status: MonitoringStatus) {
  switch (status) {
    case 'starting':
      return 'Сервер запускает анализ'
    case 'running':
      return 'Анализ выполняется'
    case 'reconnecting':
      return 'Переподключение'
    case 'error':
      return 'Ошибка анализа'
    default:
      return 'Анализ остановлен'
  }
}

function statusClassName(status: MonitoringStatus) {
  const base =
    'inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold'

  switch (status) {
    case 'running':
      return `${base} bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30`
    case 'starting':
    case 'reconnecting':
      return `${base} bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30`
    case 'error':
      return `${base} bg-red-500/15 text-red-300 ring-1 ring-red-500/30`
    default:
      return `${base} bg-slate-800 text-slate-300 ring-1 ring-slate-700`
  }
}
