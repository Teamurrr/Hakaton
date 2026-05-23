import { StreetStatusList } from './StreetStatusList'
import { useTrafficWebSocket } from './useTrafficWebSocket'
import type { ConnectionStatus } from './types'

type TrafficSidebarProps = {
  socketUrl?: string
}

const statusLabel: Record<ConnectionStatus, string> = {
  connecting: 'Подключение',
  open: 'Онлайн',
  closed: 'Отключено',
  error: 'Ошибка',
}

const statusClass: Record<ConnectionStatus, string> = {
  connecting: 'bg-amber-400',
  open: 'bg-emerald-400',
  closed: 'bg-slate-500',
  error: 'bg-red-400',
}

export function TrafficSidebar({
  socketUrl =
    'ws://127.0.0.1:8001/smart-traffic/ws/events?video_path=http%3A%2F%2F127.0.0.1%3A8001%2Fsmart-traffic%2Fsample-video.mp4',
}: TrafficSidebarProps) {
  const { connectionStatus, streets, lastMessageAt, error } = useTrafficWebSocket(socketUrl)

  return (
    <aside className="flex h-full w-full max-w-[380px] flex-col rounded-lg border border-slate-800 bg-slate-950 p-4 text-white">
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Улицы</h2>
            <p className="mt-1 text-xs text-slate-500">{socketUrl}</p>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs text-slate-300">
            <span className={`h-2 w-2 rounded-full ${statusClass[connectionStatus]}`} />
            {statusLabel[connectionStatus]}
          </div>
        </div>

        {lastMessageAt ? (
          <p className="mt-3 text-xs text-slate-500">
            Последний пакет: {new Date(lastMessageAt).toLocaleTimeString()}
          </p>
        ) : null}

        {error ? <p className="mt-3 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p> : null}
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
        <StreetStatusList streets={streets} />
      </div>
    </aside>
  )
}
