import type {
  IncomingStreetPayload,
  IncomingTrafficMessage,
  IncomingTrafficStateEvent,
  PriorityStatus,
  StreetState,
} from './types'

const DEFAULT_STREAM_STREET_ID = 'video-stream'
const DEFAULT_STREAM_STREET_NAME = 'Видеопоток'

export function parseTrafficMessage(rawMessage: string): StreetState[] {
  const parsed = JSON.parse(rawMessage) as IncomingTrafficMessage

  if (isTrafficStateEvent(parsed)) {
    return [normalizeTrafficStateEvent(parsed)]
  }

  return normalizeTrafficMessage(parsed)
}

function isTrafficStateEvent(message: IncomingTrafficMessage): message is IncomingTrafficStateEvent {
  return message.event === 'traffic_state_changed' && message.payload !== undefined
}

export function normalizeTrafficMessage(message: IncomingTrafficMessage): StreetState[] {
  const payload = message.payload
  const streetPayloads =
    message.streets ??
    payload?.streets ??
    compact([message.street, payload?.street]) ??
    compact([payload]) ??
    []

  return streetPayloads.map((street, index) => normalizeStreet(street, index))
}

export function mergeStreetUpdates(current: StreetState[], updates: StreetState[]): StreetState[] {
  if (updates.length === 0) {
    return current
  }

  const byId = new Map(current.map((street) => [street.id, street]))

  updates.forEach((update) => {
    byId.set(update.id, {
      ...byId.get(update.id),
      ...update,
    })
  })

  return Array.from(byId.values()).sort((first, second) => {
    return priorityWeight(second.priorityStatus) - priorityWeight(first.priorityStatus)
  })
}

function normalizeStreet(street: IncomingStreetPayload | undefined, index: number): StreetState {
  const now = new Date().toISOString()
  const id = street?.id ?? street?.streetId ?? `${DEFAULT_STREAM_STREET_ID}-${index}`
  const name = street?.name ?? street?.streetName ?? DEFAULT_STREAM_STREET_NAME

  return {
    id,
    name,
    vehicleCount: street?.vehicleCount ?? street?.vehicle_count ?? 0,
    priorityStatus: normalizePriority(street?.priorityStatus ?? street?.priority_status),
    recommendedGreenSeconds:
      street?.recommendedGreenSeconds ?? street?.recommended_green_seconds ?? undefined,
    updatedAt: street?.updatedAt ?? street?.updated_at ?? now,
    source: 'websocket',
    frameIndex: street?.frameIndex ?? street?.frame_index,
  }
}

function compact<T>(items: Array<T | null | undefined>): T[] | undefined {
  const result = items.filter((item): item is T => item !== null && item !== undefined)
  return result.length > 0 ? result : undefined
}

function normalizePriority(value: string | undefined): PriorityStatus {
  if (value === 'low' || value === 'medium' || value === 'high' || value === 'critical') {
    return value
  }

  return 'unknown'
}

function normalizeTrafficStateEvent(message: IncomingTrafficStateEvent): StreetState {
  const payload = message.payload
  const now = new Date().toISOString()

  return {
    id: DEFAULT_STREAM_STREET_ID,
    name: 'Поток с камеры',
    vehicleCount: payload?.vehicle_count ?? 0,
    priorityStatus: normalizePriority(payload?.priority_status),
    recommendedGreenSeconds: payload?.recommended_green_seconds,
    updatedAt: payload?.timestamp ?? now,
    source: payload?.video_path ?? 'websocket',
    frameIndex: payload?.frame_index,
  }
}

function priorityWeight(priority: PriorityStatus): number {
  switch (priority) {
    case 'critical':
      return 4
    case 'high':
      return 3
    case 'medium':
      return 2
    case 'low':
      return 1
    default:
      return 0
  }
}
