import type { PriorityStatus, StreetState } from './types'

type StreetStatusListProps = {
  streets: StreetState[]
}

const priorityLabel: Record<PriorityStatus, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  critical: 'Критический',
  unknown: 'Нет данных',
}

const priorityClass: Record<PriorityStatus, string> = {
  low: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  medium: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  high: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
  critical: 'border-red-500/30 bg-red-500/10 text-red-300',
  unknown: 'border-slate-600 bg-slate-800 text-slate-300',
}

export function StreetStatusList({ streets }: StreetStatusListProps) {
  if (streets.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-400">
        Ожидание первого сообщения от WebSocket.
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {streets.map((street) => (
        <li className="rounded-lg border border-slate-800 bg-slate-950 p-4" key={street.id}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-white">{street.name}</h3>
              <p className="mt-1 text-xs text-slate-500">
                Обновлено: {new Date(street.updatedAt).toLocaleTimeString()}
              </p>
            </div>

            <span
              className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${priorityClass[street.priorityStatus]}`}
            >
              {priorityLabel[street.priorityStatus]}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Metric label="Машины" value={street.vehicleCount} />
            <Metric label="Зеленый" value={street.recommendedGreenSeconds ?? '-'} suffix="сек" />
          </div>
        </li>
      ))}
    </ul>
  )
}

function Metric({ label, value, suffix }: { label: string; value: number | string; suffix?: string }) {
  return (
    <div className="rounded-md bg-slate-900 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-100">
        {value} {suffix && value !== '-' ? <span className="text-xs text-slate-500">{suffix}</span> : null}
      </p>
    </div>
  )
}
