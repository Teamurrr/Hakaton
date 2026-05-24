export type ConnectionStatus = 'connecting' | 'open' | 'closed' | 'error'

export type PriorityStatus = 'low' | 'medium' | 'high' | 'critical' | 'unknown'

export type StreetState = {
  id: string
  name: string
  vehicleCount: number
  priorityStatus: PriorityStatus
  recommendedGreenSeconds?: number
  updatedAt: string
  source?: string
  frameIndex?: number
}

export type TrafficSocketState = {
  connectionStatus: ConnectionStatus
  streets: StreetState[]
  lastMessageAt?: string
  error?: string
}

export type IncomingStreetPayload = {
  id?: string
  streetId?: string
  name?: string
  streetName?: string
  vehicleCount?: number
  vehicle_count?: number
  priorityStatus?: string
  priority_status?: string
  recommendedGreenSeconds?: number
  recommended_green_seconds?: number
  updatedAt?: string
  updated_at?: string
  frameIndex?: number
  frame_index?: number
}

export type IncomingTrafficMessage = {
  event?: string
  type?: string
  street?: IncomingStreetPayload
  streets?: IncomingStreetPayload[]
  payload?: IncomingStreetPayload & {
    street?: IncomingStreetPayload
    streets?: IncomingStreetPayload[]
    video_path?: string
    frame_index?: number
  }
}

export type IncomingTrafficStateEvent = {
  event?: 'traffic_state_changed'
  payload?: {
    video_path?: string
    frame_index?: number
    timestamp?: string
    vehicle_count?: number
    priority_status?: string
    recommended_green_seconds?: number
  }
}
