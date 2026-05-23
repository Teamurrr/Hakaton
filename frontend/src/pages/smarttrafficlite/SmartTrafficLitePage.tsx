import { LiveTrafficPlayer } from './LiveTrafficPlayer'
import { TrafficSidebar } from './TrafficSidebar'

type SmartTrafficLitePageProps = {
  apiBaseUrl?: string
  socketUrl?: string
  videoSrc?: string
}

export function SmartTrafficLitePage({
  apiBaseUrl = 'http://127.0.0.1:8001',
  videoSrc,
  socketUrl,
}: SmartTrafficLitePageProps) {
  const resolvedVideoSrc = videoSrc ?? `${apiBaseUrl}/smart-traffic/sample-video.mp4`
  const resolvedSocketUrl =
    socketUrl ??
    `ws://127.0.0.1:8001/smart-traffic/ws/events?video_path=${encodeURIComponent(resolvedVideoSrc)}`

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-slate-100 md:p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:h-[calc(100vh-48px)] lg:flex-row">
        <LiveTrafficPlayer apiBaseUrl={apiBaseUrl} videoSrc={resolvedVideoSrc} />
        <TrafficSidebar socketUrl={resolvedSocketUrl} />
      </div>
    </main>
  )
}

export default SmartTrafficLitePage
