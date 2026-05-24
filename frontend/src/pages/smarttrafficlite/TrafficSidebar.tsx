import { StreetStatusList } from './StreetStatusList'
import { useTrafficWebSocket } from './useTrafficWebSocket'
import type { ConnectionStatus, PriorityStatus, StreetState } from './types'

type TrafficSidebarProps = {
  socketUrl?: string
}

const statusLabel: Record<ConnectionStatus, string> = {
  connecting: 'Подключаемся к серверу',
  open: 'Аналитика в реальном времени',
  closed: 'Соединение закрыто',
  error: 'Ошибка соединения',
}

const statusClass: Record<ConnectionStatus, string> = {
  connecting: 'bg-amber-400',
  open: 'bg-emerald-400',
  closed: 'bg-slate-500',
  error: 'bg-red-400',
}

const priorityLabel: Record<PriorityStatus, string> = {
  low: 'Низкая',
  medium: 'Средняя',
  high: 'Высокая',
  critical: 'Критическая',
  unknown: 'Нет данных',
}

const priorityBadgeClass: Record<PriorityStatus, string> = {
  low: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
  medium: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30',
  high: 'bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/30',
  critical: 'bg-red-500/15 text-red-300 ring-1 ring-red-500/30',
  unknown: 'bg-slate-800 text-slate-300 ring-1 ring-slate-700',
}

export function TrafficSidebar({
  socketUrl =
    'ws://127.0.0.1:8001/smart-traffic/ws/events?video_path=http%3A%2F%2F127.0.0.1%3A8001%2Fsmart-traffic%2Fsample-video.mp4',
}: TrafficSidebarProps) {
  const { connectionStatus, streets, lastMessageAt, error } = useTrafficWebSocket(socketUrl)
  const activeStream = streets[0]

  return (
    <aside className="flex w-full max-w-[420px] flex-col gap-4 rounded-[28px] border border-slate-800 bg-slate-950/95 p-5 text-white shadow-2xl shadow-slate-950/40">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/80">SmartTrafficLite</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Результат анализа трафика</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Этот блок показывает, что модель получила из видео прямо сейчас:
              сколько машин в кадре, насколько загружен поток и сколько секунд зеленого
              рекомендуется дать светофору.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-full bg-slate-950 px-3 py-2 text-xs text-slate-300">
            <span className={`h-2.5 w-2.5 rounded-full ${statusClass[connectionStatus]}`} />
            {statusLabel[connectionStatus]}
          </div>
        </div>

        {lastMessageAt ? (
          <p className="mt-4 text-xs text-slate-500">
            Последний пакет: {new Date(lastMessageAt).toLocaleTimeString()}
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}
      </section>

      <section className="rounded-3xl border border-slate-800 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_52%),_#0f172a] p-5">
        {activeStream ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-400">Источник данных</p>
                <h3 className="mt-1 text-xl font-semibold text-white">{activeStream.name}</h3>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${priorityBadgeClass[activeStream.priorityStatus]}`}
              >
                Нагрузка: {priorityLabel[activeStream.priorityStatus]}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <SummaryCard
                accent="text-cyan-300"
                label="Машин в кадре"
                value={activeStream.vehicleCount}
              />
              <SummaryCard
                accent="text-emerald-300"
                label="Рекомендуемый зеленый"
                value={activeStream.recommendedGreenSeconds ?? '-'}
                suffix={activeStream.recommendedGreenSeconds ? 'сек' : undefined}
              />
              <SummaryCard
                accent="text-violet-300"
                label="Кадр анализа"
                value={activeStream.frameIndex ?? '-'}
              />
              <SummaryCard
                accent="text-amber-300"
                label="Обновлено"
                value={new Date(activeStream.updatedAt).toLocaleTimeString()}
              />
            </div>

            <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Рекомендация для светофора</p>
              <p className="mt-2 text-lg font-semibold text-white">{buildRecommendation(activeStream)}</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Решение рассчитывается автоматически по числу машин и уровню загруженности потока.
                Если поток становится плотнее, рекомендуемое время зеленого увеличивается.
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Технический статус</p>
              <p className="mt-2 break-all text-sm text-slate-300">{activeStream.source ?? 'websocket'}</p>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-5 text-sm text-slate-400">
            Пока нет событий от модели. Когда WebSocket получит первый результат, здесь появятся
            количество машин, уровень нагрузки и рекомендация по светофору.
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="text-lg font-semibold text-white">Последние измерения</h3>
        <p className="mt-2 text-sm text-slate-400">
          Ниже показан последний пакет данных, который пришел с backend-сервиса анализа.
        </p>
        <div className="mt-4">
          <StreetStatusList streets={streets.slice(0, 3)} />
        </div>
      </section>
    </aside>
  )
}

function SummaryCard({
  label,
  value,
  suffix,
  accent,
}: {
  label: string
  value: number | string
  suffix?: string
  accent: string
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={`mt-3 text-3xl font-semibold ${accent}`}>
        {value}
        {suffix ? <span className="ml-2 text-sm font-medium text-slate-400">{suffix}</span> : null}
      </p>
    </div>
  )
}

function buildRecommendation(stream: StreetState) {
  switch (stream.priorityStatus) {
    case 'critical':
      return `Дать приоритет этому потоку и увеличить зеленый до ${stream.recommendedGreenSeconds ?? 90} секунд.`
    case 'high':
      return `Поток плотный: стоит продлить зеленый до ${stream.recommendedGreenSeconds ?? 70} секунд.`
    case 'medium':
      return `Нагрузка средняя: подойдет режим около ${stream.recommendedGreenSeconds ?? 50} секунд зеленого.`
    case 'low':
      return `Нагрузка низкая: достаточно короткого зеленого, около ${stream.recommendedGreenSeconds ?? 30} секунд.`
    default:
      return 'Данных пока недостаточно, ждем новый пакет от модели.'
  }
}
