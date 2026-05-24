import type { PriorityStatus, StreetState } from './types'

type StreetStatusListProps = {
  streets: StreetState[]
}

const priorityLabel: Record<PriorityStatus, string> = {
  low: 'Низкая нагрузка',
  medium: 'Средняя нагрузка',
  high: 'Высокая нагрузка',
  critical: 'Критическая нагрузка',
  unknown: 'Нет данных',
}

export function StreetStatusList({ streets }: StreetStatusListProps) {
  if (streets.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-4 text-sm text-slate-400">
        Ожидаем первый пакет аналитики от сервера.
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {streets.map((street) => (
        <li className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4" key={street.id}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-100">{street.name}</p>
              <p className="mt-1 text-xs text-slate-500">
                Обновлено: {new Date(street.updatedAt).toLocaleTimeString()}
              </p>
            </div>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
              {priorityLabel[street.priorityStatus]}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <Metric label="Машин" value={street.vehicleCount} />
            <Metric label="Кадр" value={street.frameIndex ?? '-'} />
            <Metric label="Зеленый" value={street.recommendedGreenSeconds ?? '-'} suffix="сек" />
          </div>
        </li>
      ))}
    </ul>
  )
}

function Metric({ label, value, suffix }: { label: string; value: number | string; suffix?: string }) {
  return (
    <div className="rounded-xl bg-slate-950 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">
        {value}
        {suffix && value !== '-' ? <span className="ml-1 text-xs text-slate-400">{suffix}</span> : null}
      </p>
    </div>
  )
}
