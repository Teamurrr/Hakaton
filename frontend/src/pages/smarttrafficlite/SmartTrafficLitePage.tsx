import { useEffect, useRef, useState, type ChangeEvent } from 'react'

import SiteFooter from '../../components/SiteFooter'
import './smarttrafficlite.css'

type SmartTrafficLitePageProps = {
  apiBaseUrl?: string
  videoSrc?: string
  onHome: () => void
  onOpenGreenWave: () => void
  onOpenScenarios: () => void
}

type MonitoringStatus = 'stopped' | 'running' | 'error' | 'warming'
type LoadState = 'loading' | 'live' | 'empty' | 'error'

type AnalysisPayload = {
  video_path: string
  frame_index: number
  timestamp: string
  vehicle_count: number
  priority_status: 'low' | 'medium' | 'high' | 'critical' | 'unknown'
  recommended_green_seconds: number
  vehicle_counts_by_type?: Record<string, number>
}

type MonitoringResponse = {
  status?: string
  stream_url?: string | null
  error?: string | null
}

type LatestAnalysisResponse = {
  event: string | null
  payload: AnalysisPayload | null
}

type UploadedVideoResponse = {
  file_name: string
  stream_url: string
  video_url: string
}

type VideoSource = {
  analysisSource: string
  fileName: string
  previewUrl: string
}

export function SmartTrafficLitePage({
  apiBaseUrl = 'http://127.0.0.1:8001',
  videoSrc,
  onHome,
  onOpenGreenWave,
  onOpenScenarios,
}: SmartTrafficLitePageProps) {
  const defaultPreviewUrl = videoSrc ?? `${apiBaseUrl}/smart-traffic/sample-video.mp4`
  const [videoSource, setVideoSource] = useState<VideoSource>(() => buildDefaultVideoSource(defaultPreviewUrl))
  const [monitoringStatus, setMonitoringStatus] = useState<MonitoringStatus>('warming')
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [analysis, setAnalysis] = useState<AnalysisPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const autoStartedRef = useRef(false)

  useEffect(() => {
    const nextDefaultSource = buildDefaultVideoSource(defaultPreviewUrl)
    setVideoSource((currentSource) => {
      if (currentSource.analysisSource === nextDefaultSource.analysisSource) {
        return currentSource
      }

      return nextDefaultSource
    })
  }, [defaultPreviewUrl])

  useEffect(() => {
    if (autoStartedRef.current) {
      return
    }

    autoStartedRef.current = true
    void startAnalysis(buildDefaultVideoSource(defaultPreviewUrl))
  }, [defaultPreviewUrl])

  useEffect(() => {
    let isDisposed = false

    const poll = async () => {
      try {
        const [statusResponse, latestResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/smart-traffic/monitoring/status`),
          fetch(`${apiBaseUrl}/smart-traffic/analysis/latest`),
        ])

        if (!statusResponse.ok || !latestResponse.ok) {
          throw new Error('Server did not return analysis data.')
        }

        const statusPayload = (await statusResponse.json()) as MonitoringResponse
        const latestPayload = (await latestResponse.json()) as LatestAnalysisResponse

        if (isDisposed) {
          return
        }

        if (statusPayload.error) {
          setError(statusPayload.error)
          setMonitoringStatus('error')
          setLoadState('error')
          return
        }

        if (statusPayload.status === 'running') {
          setMonitoringStatus('running')
        } else if (statusPayload.status === 'error') {
          setMonitoringStatus('error')
        } else if (analysis) {
          setMonitoringStatus('stopped')
        } else {
          setMonitoringStatus('warming')
        }

        if (latestPayload.payload) {
          setAnalysis(normalizeAnalysisPayload(latestPayload.payload))
          setLoadState('live')
          setError(null)
        } else if (statusPayload.status === 'running') {
          setLoadState('loading')
        } else {
          setLoadState('empty')
        }
      } catch (pollError) {
        if (isDisposed) {
          return
        }

        setMonitoringStatus('error')
        setLoadState('error')
        setError(pollError instanceof Error ? pollError.message : 'Could not load analysis data.')
      }
    }

    void poll()
    const timer = window.setInterval(poll, 1500)

    return () => {
      isDisposed = true
      window.clearInterval(timer)
    }
  }, [apiBaseUrl, analysis])

  useEffect(() => {
    return () => {
      void fetch(`${apiBaseUrl}/smart-traffic/monitoring/stop`, {
        method: 'POST',
        keepalive: true,
      }).catch(() => undefined)
    }
  }, [apiBaseUrl])

  async function startAnalysis(nextSource: VideoSource = videoSource) {
    setError(null)
    setMonitoringStatus('warming')
    setLoadState('loading')
    setAnalysis(null)

    try {
      const response = await fetch(
        `${apiBaseUrl}/smart-traffic/monitoring/start?stream_url=${encodeURIComponent(nextSource.analysisSource)}`,
        { method: 'POST' },
      )

      if (!response.ok) {
        throw new Error('Could not start traffic analysis.')
      }

      setMonitoringStatus('running')
    } catch (startError) {
      setMonitoringStatus('error')
      setLoadState('error')
      setError(startError instanceof Error ? startError.message : 'Failed to start traffic analysis.')
    }
  }

  async function stopAnalysis() {
    setError(null)

    try {
      const response = await fetch(`${apiBaseUrl}/smart-traffic/monitoring/stop`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Could not stop traffic analysis.')
      }

      setMonitoringStatus('stopped')
      setLoadState('empty')
      setAnalysis(null)
    } catch (stopError) {
      setMonitoringStatus('error')
      setError(stopError instanceof Error ? stopError.message : 'Failed to stop traffic analysis.')
    }
  }

  async function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) {
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch(`${apiBaseUrl}/smart-traffic/video/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Video upload failed.')
      }

      const payload = (await response.json()) as UploadedVideoResponse
      const nextSource = {
        analysisSource: payload.stream_url,
        fileName: selectedFile.name,
        previewUrl: `${apiBaseUrl}${payload.video_url}`,
      }

      setVideoSource(nextSource)
      await startAnalysis(nextSource)
    } catch (uploadError) {
      setMonitoringStatus('error')
      setLoadState('error')
      setError(uploadError instanceof Error ? uploadError.message : 'Could not upload the selected video.')
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }

  const signalMode = getSignalMode(analysis)

  return (
    <main className="stl-page">
      <header className="topbar">
        <button className="brand" onClick={onHome} type="button">
          <span className="brand-mark" aria-hidden="true" />
          <span>Smart Traffic</span>
        </button>

        <nav className="nav-actions" aria-label="Основная навигация">
          <button className="nav-button" onClick={onHome} type="button">
            Главная
          </button>
          <button className="nav-button" onClick={onOpenGreenWave} type="button">
            Зеленая волна
          </button>
          <button className="nav-button nav-button-primary" onClick={onOpenScenarios} type="button">
            Умный светофор
          </button>
        </nav>
      </header>

      <section className="stl-hero">
        <div>
          <p className="stl-eyebrow">Smart Traffic Lite</p>
          <h1>Traffic density analysis from video</h1>
          <p className="stl-subtitle">
            Upload a road video, watch the original stream, and get a live recommendation for the traffic light cycle
            based on the detected vehicle load.
          </p>
        </div>

        <div className={`stl-status-badge stl-status-${monitoringStatus}`}>
          {statusLabel(monitoringStatus, loadState, isUploading)}
        </div>
      </section>

      <section className="stl-grid">
        <section className="stl-panel stl-video-panel">
          <div className="stl-panel-head">
            <div>
              <p className="stl-panel-kicker">Video stream</p>
              <h2>Source footage</h2>
            </div>

            <div className="stl-panel-actions">
              <button className="stl-button stl-button-primary" onClick={() => void startAnalysis()} type="button">
                Restart analysis
              </button>
              <button className="stl-button stl-button-secondary" onClick={() => void stopAnalysis()} type="button">
                Stop
              </button>
            </div>
          </div>

          <div className="stl-upload-card">
            <div>
              <p className="stl-card-label">Change the source video</p>
              <h3>Upload your own `.mp4` from the client side</h3>
              <p className="stl-upload-copy">
                The file is sent to the backend, shown immediately in the player, and the analysis restarts on the new
                clip.
              </p>
            </div>

            <label className={`stl-upload-button ${isUploading ? 'is-busy' : ''}`}>
              <input accept="video/mp4" onChange={handleFileSelection} type="file" />
              {isUploading ? 'Uploading video...' : 'Choose .mp4'}
            </label>
          </div>

          <div className="stl-video-meta">
            <div>
              <span className="stl-footnote-label">Current source</span>
              <strong>{videoSource.fileName}</strong>
            </div>
            <div>
              <span className="stl-footnote-label">Analysis input</span>
              <strong>{isUploading ? 'Preparing uploaded video' : 'Ready to process'}</strong>
            </div>
          </div>

          <div className="stl-video-stage">
            <video
              key={videoSource.previewUrl}
              className="stl-video"
              controls
              autoPlay
              muted
              playsInline
              src={videoSource.previewUrl}
            />
            <div className="stl-video-overlay">
              <span className={`stl-live-dot ${loadState === 'live' ? 'is-live' : ''}`} />
              <span>{loadState === 'live' ? 'Model is reading the traffic flow' : 'Video is ready, waiting for fresh analysis'}</span>
            </div>
          </div>

          <div className="stl-video-footnote">
            <div>
              <span className="stl-footnote-label">Mode</span>
              <strong>The original uploaded video always stays visible</strong>
            </div>
            <div>
              <span className="stl-footnote-label">Update signal</span>
              <strong>Traffic metrics refresh on the right while the video keeps playing</strong>
            </div>
          </div>
        </section>

        <section className="stl-panel stl-dashboard-panel">
          <div className="stl-panel-head">
            <div>
              <p className="stl-panel-kicker">Model output</p>
              <h2>Traffic light decision</h2>
            </div>
          </div>

          {error ? <div className="stl-error-box">{error}</div> : null}

          {loadState === 'loading' && !analysis ? (
            <div className="stl-loading-box">
              <div className="stl-spinner" />
              <div>
                <h3>Model is warming up</h3>
                <p>The first result can take a few seconds while YOLO loads weights and starts reading frames.</p>
              </div>
            </div>
          ) : null}

          {analysis ? (
            <>
              <div className="stl-signal-card">
                <div>
                  <p className="stl-card-label">Recommendation</p>
                  <h3>{signalTitle(signalMode)}</h3>
                  <p className="stl-card-description">{buildRecommendation(analysis)}</p>
                </div>

                <div className="stl-traffic-light">
                  <span className={`stl-light stl-light-red ${signalMode === 'stop' ? 'is-active' : ''}`} />
                  <span className={`stl-light stl-light-green ${signalMode === 'go' ? 'is-active' : ''}`} />
                </div>
              </div>

              <div className="stl-metric-grid">
                <MetricCard label="Vehicles in frame" value={analysis.vehicle_count} accent="cyan" />
                <MetricCard label="Load level" value={priorityLabel(analysis.priority_status)} accent="orange" />
                <MetricCard
                  label="Recommended green"
                  value={analysis.recommended_green_seconds}
                  suffix="sec"
                  accent="green"
                />
                <MetricCard label="Analysis frame" value={analysis.frame_index} accent="violet" />
              </div>

              <div className="stl-details-grid">
                <div className="stl-detail-card">
                  <p className="stl-card-label">Vehicle mix</p>
                  <ul className="stl-breakdown-list">
                    {Object.entries(analysis.vehicle_counts_by_type ?? {}).map(([key, value]) => (
                      <li key={key}>
                        <span>{translateVehicleType(key)}</span>
                        <strong>{value}</strong>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="stl-detail-card">
                  <p className="stl-card-label">Live update</p>
                  <div className="stl-technical-list">
                    <div>
                      <span>Time</span>
                      <strong>{new Date(analysis.timestamp).toLocaleTimeString()}</strong>
                    </div>
                    <div>
                      <span>Source</span>
                      <strong>{analysis.video_path.split('\\').pop() ?? analysis.video_path}</strong>
                    </div>
                    <div>
                      <span>Status</span>
                      <strong>{loadState === 'live' ? 'Data is flowing' : 'Waiting'}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {loadState === 'empty' && !analysis ? (
            <div className="stl-empty-box">
              Analysis has not returned a frame yet. Upload another clip or restart the current run to begin again.
            </div>
          ) : null}
        </section>
      </section>

      <div className="container">
        <SiteFooter
          onHome={onHome}
          onOpenGreenWave={onOpenGreenWave}
          onOpenScenarios={onOpenScenarios}
        />
      </div>
    </main>
  )
}

function MetricCard({
  label,
  value,
  suffix,
  accent,
}: {
  label: string
  value: number | string
  suffix?: string
  accent: 'cyan' | 'orange' | 'green' | 'violet'
}) {
  return (
    <article className={`stl-metric-card stl-metric-${accent}`}>
      <p>{label}</p>
      <strong>
        {value}
        {suffix ? <span>{suffix}</span> : null}
      </strong>
    </article>
  )
}

function buildDefaultVideoSource(previewUrl: string): VideoSource {
  return {
    analysisSource: previewUrl,
    fileName: previewUrl.split('/').pop() ?? 'sample-video.mp4',
    previewUrl,
  }
}

function normalizeAnalysisPayload(payload: AnalysisPayload): AnalysisPayload {
  return {
    ...payload,
    priority_status: payload.priority_status ?? 'unknown',
    vehicle_counts_by_type: payload.vehicle_counts_by_type ?? {},
  }
}

function statusLabel(status: MonitoringStatus, loadState: LoadState, isUploading: boolean) {
  if (isUploading) {
    return 'Uploading video'
  }

  if (loadState === 'loading') {
    return 'Model is loading'
  }

  switch (status) {
    case 'running':
      return 'Analysis is active'
    case 'stopped':
      return 'Analysis is stopped'
    case 'error':
      return 'Analysis error'
    default:
      return 'Preparing analysis'
  }
}

function priorityLabel(priority: AnalysisPayload['priority_status']) {
  switch (priority) {
    case 'low':
      return 'Low'
    case 'medium':
      return 'Medium'
    case 'high':
      return 'High'
    case 'critical':
      return 'Critical'
    default:
      return 'No data'
  }
}

function buildRecommendation(analysis: AnalysisPayload) {
  switch (analysis.priority_status) {
    case 'critical':
      return `Traffic is overloaded. Keep priority on this direction and hold green for about ${analysis.recommended_green_seconds} seconds.`
    case 'high':
      return `Traffic is heavy. Extend the green phase to roughly ${analysis.recommended_green_seconds} seconds.`
    case 'medium':
      return `Traffic is moderate. A medium cycle of about ${analysis.recommended_green_seconds} seconds is appropriate.`
    case 'low':
      return `Traffic is light. A shorter green phase around ${analysis.recommended_green_seconds} seconds is enough.`
    default:
      return 'There is not enough data yet to recommend a traffic light mode.'
  }
}

function getSignalMode(analysis: AnalysisPayload | null): 'stop' | 'go' {
  if (!analysis) {
    return 'stop'
  }

  if (analysis.priority_status === 'critical' || analysis.priority_status === 'high') {
    return 'go'
  }

  if (analysis.priority_status === 'medium') {
    return 'go'
  }

  return 'stop'
}

function signalTitle(mode: 'stop' | 'go') {
  switch (mode) {
    case 'go':
      return 'Green signal'
    default:
      return 'Red signal'
  }
}

function translateVehicleType(value: string) {
  const map: Record<string, string> = {
    bicycle: 'Bicycles',
    bus: 'Buses',
    car: 'Cars',
    emergency: 'Emergency',
    motorcycle: 'Motorcycles',
    truck: 'Trucks',
  }

  return map[value] ?? value
}

export default SmartTrafficLitePage
